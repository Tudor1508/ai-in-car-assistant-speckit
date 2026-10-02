from fastapi import HTTPException
from decimal import Decimal, ROUND_HALF_UP
import secrets
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.data.models.account import Account
from src.data.models.trip_favorite import TripFavorite
from src.trips.provider import (
    ORSProvider,
    ORSProviderUnavailable,
    ORSRouteNotFound,
    StationCandidate,
)
from src.trips.schemas import (
    PlaceCollection,
    FavoriteCollection,
    FavoritePlace,
    FavoriteRoute,
    FavoriteRouteCreate,
    PlaceSuggestion,
    RouteFeasibility,
    RouteGeometry,
    RouteLeg,
    RouteMetrics,
    RouteStop,
    TripPreviewRequest,
    TripPreviewResponse,
    VehicleRangeSummary,
)
from src.trips.settings import TripConfigurationError, TripSettings
from src.vehicles.service import get_owned_vehicle


def _coordinate_6(value: float) -> Decimal:
    rounded = Decimal(str(value)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    return Decimal("0.000000") if rounded == 0 else rounded


def _favorite_response(row: TripFavorite) -> FavoriteRoute:
    created_at = row.created_at
    if created_at.tzinfo is None:
        from datetime import timezone

        created_at = created_at.replace(tzinfo=timezone.utc)
    return FavoriteRoute(
        id=row.id,
        origin=FavoritePlace(
            label=row.origin_label,
            latitude=float(row.origin_latitude),
            longitude=float(row.origin_longitude),
        ),
        destination=FavoritePlace(
            label=row.destination_label,
            latitude=float(row.destination_latitude),
            longitude=float(row.destination_longitude),
        ),
        created_at=created_at,
    )


def list_favorite_routes(db: Session, owner_id: str) -> FavoriteCollection:
    rows = db.scalars(
        select(TripFavorite)
        .where(TripFavorite.owner_account_id == owner_id)
        .order_by(TripFavorite.created_at.desc(), TripFavorite.id.asc())
    ).all()
    return FavoriteCollection(favorites=[_favorite_response(row) for row in rows])


def save_favorite_route(
    db: Session, owner_id: str, request: FavoriteRouteCreate
) -> tuple[FavoriteRoute, bool]:
    origin_latitude = _coordinate_6(request.origin.latitude)
    origin_longitude = _coordinate_6(request.origin.longitude)
    destination_latitude = _coordinate_6(request.destination.latitude)
    destination_longitude = _coordinate_6(request.destination.longitude)
    match = select(TripFavorite).where(
        TripFavorite.owner_account_id == owner_id,
        TripFavorite.origin_latitude == origin_latitude,
        TripFavorite.origin_longitude == origin_longitude,
        TripFavorite.destination_latitude == destination_latitude,
        TripFavorite.destination_longitude == destination_longitude,
    )
    existing = db.scalar(match)
    if existing is not None:
        return _favorite_response(existing), False

    row = TripFavorite(
        id=secrets.token_hex(16),
        owner_account_id=owner_id,
        origin_label=request.origin.label,
        origin_latitude=origin_latitude,
        origin_longitude=origin_longitude,
        destination_label=request.destination.label,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
    )
    try:
        with db.begin_nested():
            db.add(row)
            db.flush()
    except IntegrityError:
        existing = db.scalar(match)
        if existing is None:
            raise
        return _favorite_response(existing), False
    return _favorite_response(row), True


def search_places(provider: ORSProvider, query: str, settings: TripSettings) -> PlaceCollection:
    if len(query.strip()) < settings.geocode_min_chars:
        raise HTTPException(status_code=422, detail="validation_error")
    try:
        places = provider.autocomplete(query.strip())
    except ORSProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="routing_provider_unavailable") from error
    except ORSRouteNotFound:
        places = []
    return PlaceCollection(places=places)


def preview_owned_trip(
    db: Session,
    account: Account,
    request: TripPreviewRequest,
    settings: TripSettings,
) -> TripPreviewResponse:
    vehicle = get_owned_vehicle(db, account.id, request.vehicle_id)
    if vehicle.range_km <= 0:
        raise HTTPException(status_code=422, detail="validation_error")

    provider = ORSProvider(settings)
    initial_available_range_m = vehicle.range_km * 1000 * request.current_level_percent / 100
    maximum_range_m = vehicle.range_km * 1000
    current_point = (request.origin.longitude, request.origin.latitude)
    destination_point = (request.destination.longitude, request.destination.latitude)
    route_points = [current_point]
    legs: list[RouteLeg] = []
    reachable_segments: list[RouteMetrics] = []
    stops: list[RouteStop] = []
    progress_before_current_m = 0.0
    current_range_m = initial_available_range_m
    station_type = "charging" if vehicle.type == "electric" else "fuel"
    feasibility = RouteFeasibility(status="complete", message=None)

    try:
        for stop_sequence in range(1, settings.max_stops + 1):
            remaining_route = provider.directions([current_point, destination_point])
            if remaining_route.distance_m <= current_range_m:
                legs.append(
                    RouteLeg(
                        sequence=len(legs) + 1,
                        distance_m=remaining_route.distance_m,
                        duration_s=remaining_route.duration_s,
                    )
                )
                reachable_segments.append(remaining_route)
                route_points.append(destination_point)
                break

            candidates = provider.stations_near_route(
                remaining_route.geometry,
                station_type,
                vehicle.fuel_type if station_type == "fuel" else None,
            )
            selected: tuple[StationCandidate, RouteMetrics] | None = None
            for candidate in sorted(
                candidates,
                key=lambda item: item.route_progress_m,
                reverse=True,
            ):
                if candidate.route_progress_m <= 0:
                    continue
                candidate_point = (candidate.stop.longitude, candidate.stop.latitude)
                try:
                    candidate_route = provider.directions([current_point, candidate_point])
                except ORSRouteNotFound:
                    continue
                if candidate_route.distance_m <= current_range_m:
                    selected = (candidate, candidate_route)
                    break

            if selected is None:
                feasibility = RouteFeasibility(
                    status="incomplete",
                    message="No compatible station was found within the available range for the next route leg.",
                )
                break

            candidate, candidate_route = selected
            candidate_point = (candidate.stop.longitude, candidate.stop.latitude)
            legs.append(
                RouteLeg(
                    sequence=len(legs) + 1,
                    distance_m=candidate_route.distance_m,
                    duration_s=candidate_route.duration_s,
                )
            )
            reachable_segments.append(candidate_route)
            stops.append(
                candidate.stop.model_copy(
                    update={
                        "sequence": stop_sequence,
                        "leg_distance_m": candidate_route.distance_m,
                        "route_progress_m": progress_before_current_m
                        + candidate.route_progress_m,
                    }
                )
            )
            route_points.append(candidate_point)
            current_point = candidate_point
            progress_before_current_m += candidate_route.distance_m
            current_range_m = maximum_range_m
        else:
            remaining_route = provider.directions([current_point, destination_point])
            if remaining_route.distance_m <= current_range_m:
                legs.append(
                    RouteLeg(
                        sequence=len(legs) + 1,
                        distance_m=remaining_route.distance_m,
                        duration_s=remaining_route.duration_s,
                    )
                )
                reachable_segments.append(remaining_route)
                route_points.append(destination_point)
            else:
                feasibility = RouteFeasibility(
                    status="incomplete",
                    message="The configured maximum number of stops was reached before the destination became reachable.",
                )
        if feasibility.status == "complete":
            final_route = provider.directions(route_points)
        else:
            reachable_coordinates: list[tuple[float, float]] = []
            for segment in reachable_segments:
                segment_coordinates = segment.geometry.coordinates
                if reachable_coordinates and reachable_coordinates[-1] == segment_coordinates[0]:
                    reachable_coordinates.extend(segment_coordinates[1:])
                else:
                    reachable_coordinates.extend(segment_coordinates)
            if len(reachable_coordinates) < 2:
                reachable_coordinates = [current_point, current_point]
            final_route = RouteMetrics(
                geometry=RouteGeometry(type="LineString", coordinates=reachable_coordinates),
                distance_m=sum(segment.distance_m for segment in reachable_segments),
                duration_s=sum(segment.duration_s for segment in reachable_segments),
            )
    except ORSRouteNotFound as error:
        raise HTTPException(status_code=422, detail="route_not_found") from error
    except ORSProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="routing_provider_unavailable") from error
    except TripConfigurationError as error:
        raise HTTPException(status_code=503, detail="routing_provider_unavailable") from error

    return TripPreviewResponse(
        feasibility=feasibility,
        vehicle=VehicleRangeSummary(
            id=vehicle.id,
            current_level_percent=request.current_level_percent,
            available_range_km=vehicle.range_km * request.current_level_percent / 100,
            maximum_range_km=vehicle.range_km,
        ),
        route=final_route,
        legs=legs,
        stops=stops,
    )
