from fastapi import HTTPException
from decimal import Decimal, ROUND_HALF_UP
from concurrent.futures import ThreadPoolExecutor
import math
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
    ScenicComparisonUnavailable,
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
    TripRouteChoice,
    TripRouteOption,
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


def _route_geometry_length_m(geometry: RouteGeometry) -> float:
    return sum(
        ORSProvider._great_circle_distance_m(first, second)
        for first, second in zip(geometry.coordinates, geometry.coordinates[1:])
    )


def _select_recommendations_by_route_sections(
    items: list[dict],
    *,
    section_length_m: float,
    route_length_m: float,
    maximum_count: int,
    minimum_start_progress_m: float = 10_000,
) -> list[dict]:
    """Pick the most important place from each route section, after leaving the start area."""
    if route_length_m <= minimum_start_progress_m or section_length_m <= 0 or maximum_count <= 0:
        return []
    selected: list[dict] = []
    section_count = min(maximum_count, math.ceil(route_length_m / section_length_m))
    for section_index in range(section_count):
        section_start = section_index * section_length_m
        section_end = min((section_index + 1) * section_length_m, route_length_m)
        eligible = []
        for item in items:
            progress = float(item.get("route_progress_m", 0) or 0)
            lower_bound = max(section_start, minimum_start_progress_m)
            if lower_bound <= progress < section_end or (
                section_index == section_count - 1 and progress == section_end
            ):
                eligible.append(item)
        if not eligible:
            continue
        midpoint = (section_start + section_end) / 2
        selected.append(max(
            eligible,
            key=lambda item: (
                float(item.get("importance", 0) or 0),
                -abs(float(item.get("route_progress_m", 0) or 0) - midpoint),
            ),
        ))
    return sorted(selected, key=lambda item: float(item.get("route_progress_m", 0) or 0))


def _keep_recommendations_clear_of_stops(
    attractions: list[dict], restaurants: list[dict], stops: list[RouteStop],
    *, minimum_distance_m: float = 10_000,
) -> tuple[list[dict], list[dict]]:
    """Keep mandatory energy stops and space Scenic POIs away from them and each other."""
    occupied = [
        (stop.longitude, stop.latitude)
        for stop in stops
    ]

    def accept_candidates(items: list[dict]) -> list[dict]:
        accepted = []
        for item in sorted(items, key=lambda entry: -float(entry.get("importance", 0) or 0)):
            point = (float(item["longitude"]), float(item["latitude"]))
            if any(
                ORSProvider._great_circle_distance_m(point, existing) < minimum_distance_m
                for existing in occupied
            ):
                continue
            accepted.append(item)
            occupied.append(point)
        return sorted(accepted, key=lambda entry: float(entry.get("route_progress_m", 0) or 0))

    accepted_attractions = accept_candidates(attractions)
    accepted_restaurants = accept_candidates(restaurants)
    return accepted_attractions, accepted_restaurants


def preview_owned_trip(
    db: Session,
    account: Account,
    request: TripPreviewRequest,
    settings: TripSettings,
    *,
    _initial_route: RouteMetrics | None = None,
) -> TripPreviewResponse:
    vehicle = get_owned_vehicle(db, account.id, request.vehicle_id)
    if vehicle.range_km <= 0:
        raise HTTPException(status_code=422, detail="validation_error")

    provider = ORSProvider(settings)
    if request.route_preference == "all":
        points = [
            (request.origin.longitude, request.origin.latitude),
            (request.destination.longitude, request.destination.latitude),
        ]
        candidate_groups: dict[tuple, dict] = {}
        try:
            for preference in ("fastest", "shortest"):
                for route in provider.directions_candidates(points, preference):
                    geometry_key = tuple(route.geometry.coordinates)
                    group = candidate_groups.setdefault(
                        geometry_key,
                        {"route": route, "preference": preference, "preferences": set()},
                    )
                    group["preferences"].add(preference)
        except ORSRouteNotFound as error:
            raise HTTPException(status_code=422, detail="route_not_found") from error
        except ORSProviderUnavailable as error:
            raise HTTPException(status_code=502, detail="routing_provider_unavailable") from error

        if not candidate_groups:
            raise HTTPException(status_code=422, detail="route_not_found")

        # Alternative-route requests are limited to short trips by the public
        # ORS service. Add a complete highway-avoiding candidate so longer trips
        # still have a chance to produce a distinct Scenic route.
        try:
            scenic_candidate = provider.scenic_biased_candidate(points)
        except ORSProviderUnavailable:
            scenic_candidate = None
        if scenic_candidate is not None:
            geometry_key = tuple(scenic_candidate.geometry.coordinates)
            candidate_groups.setdefault(
                geometry_key,
                {"route": scenic_candidate, "preference": "fastest", "preferences": set()},
            )

        fastest_key = min(
            (key for key, group in candidate_groups.items() if "fastest" in group["preferences"]),
            key=lambda key: candidate_groups[key]["route"].duration_s,
        )
        shortest_key = min(
            (key for key, group in candidate_groups.items() if "shortest" in group["preferences"]),
            key=lambda key: candidate_groups[key]["route"].distance_m,
        )

        attractions_by_key: dict[tuple, list[dict]] = {}
        scenic_reason: str | None = None
        if len(candidate_groups) < 2:
            scenic_reason = "no_distinct_candidates"
        candidate_items = list(candidate_groups.items())
        with ThreadPoolExecutor(max_workers=min(4, len(candidate_items))) as executor:
            attraction_jobs = {
                key: executor.submit(
                    provider.tourist_attractions_near_route,
                    group["route"].geometry,
                )
                for key, group in candidate_items
            }
            for key, _group in candidate_items:
                try:
                    attractions_by_key[key] = attraction_jobs[key].result()
                except ScenicComparisonUnavailable as error:
                    if scenic_reason is None:
                        scenic_reason = str(error) if str(error) in {
                            "poi_geometry_limit", "poi_results_incomplete",
                        } else "no_distinct_candidates"
                except ORSProviderUnavailable:
                    if scenic_reason is None:
                        scenic_reason = "provider_unavailable"

        def distinct_count(items: list[dict]) -> int:
            source_ids = [item.get("source_id") for item in items]
            return len({source_id for source_id in source_ids if source_id is not None}) + sum(
                source_id is None for source_id in source_ids
            )

        # Keep a Scenic choice available whenever routing produced a candidate.
        # When POI comparison is partial or unavailable, use the best-scoring
        # candidates that could be checked; if none could be checked, fall back
        # to Fastest and disclose that attraction coverage is incomplete.
        scores = {key: distinct_count(items) for key, items in attractions_by_key.items()}
        if not scores:
            scenic_reason = scenic_reason or "provider_unavailable"
            scores = {fastest_key: 0}
        maximum_count = max(scores.values(), default=0)
        if maximum_count == 0 and scenic_reason is None:
            scenic_reason = "no_attractions_found"
        scenic_key = min(
            (key for key, count in scores.items() if count == maximum_count),
            key=lambda key: (
                candidate_groups[key]["route"].duration_s,
                candidate_groups[key]["route"].distance_m,
            ),
        )

        choice_keys = {"fastest": fastest_key, "shortest": shortest_key}
        if scenic_key is not None:
            choice_keys["scenic"] = scenic_key

        scenic_geometry = candidate_groups[scenic_key]["route"].geometry if scenic_key is not None else None
        scenic_route_length_m = _route_geometry_length_m(scenic_geometry) if scenic_geometry is not None else 0
        # Attractions are informational POIs: preserve every source result and
        # only order them along the route. Do not sample them by a fixed interval.
        scenic_attractions = sorted(
            attractions_by_key.get(scenic_key, []) if scenic_key is not None else [],
            key=lambda item: float(item.get("route_progress_m", 0) or 0),
        )
        scenic_restaurants: list[dict] = []
        if scenic_key is not None:
            try:
                restaurant_search = getattr(provider, "restaurants_near_route", None)
                if restaurant_search is not None:
                    scenic_restaurants = _select_recommendations_by_route_sections(
                        restaurant_search(candidate_groups[scenic_key]["route"].geometry),
                        section_length_m=400_000,
                        route_length_m=scenic_route_length_m,
                        maximum_count=math.ceil(scenic_route_length_m / 400_000),
                    )
            except ORSProviderUnavailable:
                scenic_restaurants = []

        # Keep separate cards for each preference even when ORS returns the
        # same geometry. That lets Fastest/Shortest omit recommendations while
        # Scenic can show them for the same physical route.
        planned_by_key: dict[tuple, TripPreviewResponse] = {}
        options_by_preference: dict[str, dict] = {}
        for index, preference in enumerate(("fastest", "shortest", "scenic"), start=1):
            if preference not in choice_keys:
                continue
            key = choice_keys[preference]
            if key not in planned_by_key:
                group = candidate_groups[key]
                planned_by_key[key] = preview_owned_trip(
                    db,
                    account,
                    request.model_copy(update={"route_preference": group["preference"]}),
                    settings,
                    _initial_route=group["route"],
                )
            planned = planned_by_key[key]
            is_scenic = preference == "scenic"
            _, option_restaurants = (
                _keep_recommendations_clear_of_stops(
                    [],
                    scenic_restaurants,
                    planned.stops + ([planned.feasibility.first_unreachable_stop] if planned.feasibility.first_unreachable_stop else []),
                )
                if is_scenic else ([], [])
            )
            option_attractions = scenic_attractions if is_scenic else []
            option = {
                "id": f"route-option-{index}",
                "attraction_count": len(option_attractions),
                "route_labels": [preference],
                "feasibility": planned.feasibility,
                "vehicle": planned.vehicle,
                "route": planned.route,
                "legs": planned.legs,
                "stops": planned.stops,
                "attractions": [
                    {**item, "sequence": sequence}
                    for sequence, item in enumerate(option_attractions, start=1)
                ] if is_scenic else [],
                "restaurants": [
                    {**item, "sequence": sequence}
                    for sequence, item in enumerate(option_restaurants, start=1)
                ] if is_scenic else [],
            }
            options_by_preference[preference] = option

        # A canonical choice is a distinct route geometry. When preferences
        # resolve to the same geometry, expose one option and combine labels.
        options_by_geometry: dict[tuple, dict] = {}
        merged_by_preference: dict[str, dict] = {}
        for preference in ("fastest", "shortest", "scenic"):
            option = options_by_preference.get(preference)
            if option is None:
                continue
            geometry_key = tuple(tuple(point) for point in option["route"].geometry.coordinates)
            existing = options_by_geometry.get(geometry_key)
            if existing is None:
                options_by_geometry[geometry_key] = option
                existing = option
            else:
                labels = list(dict.fromkeys([*existing["route_labels"], preference]))
                if preference == "scenic":
                    option = {**option, "id": existing["id"], "route_labels": labels}
                    options_by_geometry[geometry_key] = option
                    existing = option
                else:
                    existing["route_labels"] = labels
            merged_by_preference[preference] = existing
        options_by_preference = merged_by_preference

        route_choices = [
            TripRouteChoice(
                preference=preference,
                status="available" if preference in choice_keys else "unavailable",
                route_option_id=(options_by_preference[preference]["id"] if preference in options_by_preference else None),
                reason=(scenic_reason if preference == "scenic" else None),
            )
            for preference in ("fastest", "shortest", "scenic")
        ]
        first = options_by_preference["fastest"]
        return TripPreviewResponse(
            feasibility=first["feasibility"],
            vehicle=first["vehicle"],
            route=first["route"],
            legs=first["legs"],
            stops=first["stops"],
            route_preference="all",
            selected_route_option_id=first["id"],
            route_options=[
                TripRouteOption.model_validate(option)
                for option in options_by_geometry.values()
            ],
            route_choices=route_choices,
            attractions=[],
            restaurants=[],
        )

    if request.route_preference == "scenic":
        points = [
            (request.origin.longitude, request.origin.latitude),
            (request.destination.longitude, request.destination.latitude),
        ]
        try:
            candidates = []
            seen_geometries = set()
            for preference in ("fastest", "shortest"):
                preference_candidates = provider.directions_candidates(points, preference)
                for route in preference_candidates:
                    geometry_key = tuple(route.geometry.coordinates)
                    if geometry_key not in seen_geometries:
                        seen_geometries.add(geometry_key)
                        candidates.append((preference, route))
            if len(candidates) < 2:
                raise ScenicComparisonUnavailable("no_distinct_candidates")
            with ThreadPoolExecutor(max_workers=min(4, len(candidates))) as executor:
                attraction_jobs = [
                    (preference, route, executor.submit(
                        provider.tourist_attractions_near_route, route.geometry,
                    ))
                    for preference, route in candidates
                ]
                scored = [
                    (preference, route, job.result())
                    for preference, route, job in attraction_jobs
                ]
            def distinct_count(items: list[dict]) -> int:
                ids = [item.get("source_id") for item in items]
                return len({value for value in ids if value is not None}) + sum(value is None for value in ids)
            maximum_count = max(distinct_count(items) for _, _, items in scored)
            winners = [(pref, route, items) for pref, route, items in scored if distinct_count(items) == maximum_count]
            options = []
            for index, (preference, candidate, source_attractions) in enumerate(winners, start=1):
                planned = preview_owned_trip(
                    db, account, request.model_copy(update={"route_preference": preference}), settings,
                    _initial_route=candidate,
                )
                # Scenic comparison is based on the complete candidate route;
                # the range planner independently supplies stops and feasibility.
                # Preserve incomplete energy plans instead of hiding them behind
                # Scenic unavailability when the reachable geometry is shorter.
                candidate_length_m = _route_geometry_length_m(candidate.geometry)
                selected_attractions = sorted(
                    source_attractions,
                    key=lambda item: float(item.get("route_progress_m", 0) or 0),
                )
                restaurants: list[dict] = []
                restaurant_search = getattr(provider, "restaurants_near_route", None)
                if restaurant_search is not None:
                    try:
                        restaurants = _select_recommendations_by_route_sections(
                            restaurant_search(candidate.geometry),
                            section_length_m=400_000,
                            route_length_m=candidate_length_m,
                            maximum_count=math.ceil(candidate_length_m / 400_000),
                        )
                    except ORSProviderUnavailable:
                        restaurants = []
                _, restaurants = _keep_recommendations_clear_of_stops(
                    [],
                    restaurants,
                    planned.stops + ([planned.feasibility.first_unreachable_stop] if planned.feasibility.first_unreachable_stop else []),
                )
                attractions = [{**item, "sequence": sequence} for sequence, item in enumerate(selected_attractions, start=1)]
                options.append({
                    "id": f"scenic-option-{index}",
                    "attraction_count": len(attractions),
                    "route_labels": ["scenic"],
                    "feasibility": planned.feasibility,
                    "vehicle": planned.vehicle,
                    "route": planned.route,
                    "legs": planned.legs,
                    "stops": planned.stops,
                    "attractions": attractions,
                    "restaurants": [{**item, "sequence": sequence} for sequence, item in enumerate(restaurants, start=1)],
                })
            first = options[0]
            return TripPreviewResponse(
                feasibility=first["feasibility"], vehicle=first["vehicle"],
                route=first["route"], legs=first["legs"], stops=first["stops"],
                route_preference="scenic", selected_route_option_id=first["id"],
                route_options=options, attractions=first["attractions"], restaurants=first["restaurants"],
            )
        except ScenicComparisonUnavailable as error:
            reason = str(error) if str(error) in {
                "no_distinct_candidates", "poi_geometry_limit", "poi_results_incomplete",
                "candidate_comparison_unavailable",
            } else "candidate_comparison_unavailable"
            raise HTTPException(status_code=422, detail={
                "code": "route_preference_unavailable", "reason": reason,
            }) from error
        except ORSRouteNotFound as error:
            raise HTTPException(status_code=422, detail={
                "code": "route_preference_unavailable", "reason": "no_distinct_candidates",
            }) from error
        except ORSProviderUnavailable as error:
            raise HTTPException(status_code=502, detail="routing_provider_unavailable") from error

    route_preference = request.route_preference if request.route_preference in {"fastest", "shortest"} else None
    initial_available_range_m = vehicle.range_km * 1000 * request.current_level_percent / 100
    maximum_range_m = vehicle.range_km * 1000
    current_point = (request.origin.longitude, request.origin.latitude)
    destination_point = (request.destination.longitude, request.destination.latitude)
    route_points = [current_point]
    legs: list[RouteLeg] = []
    reachable_segments: list[RouteMetrics] = []
    stops: list[RouteStop] = []
    first_unreachable_stop: RouteStop | None = None
    incomplete_remaining_route: RouteMetrics | None = None
    progress_before_current_m = 0.0
    current_range_m = initial_available_range_m
    station_type = "charging" if vehicle.type == "electric" else "fuel"
    feasibility = RouteFeasibility(status="complete", message=None)

    try:
        for stop_sequence in range(1, settings.max_stops + 1):
            remaining_route = (
                _initial_route
                if stop_sequence == 1 and _initial_route is not None
                else provider.directions([current_point, destination_point], route_preference)
            )
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
            ordered_candidates = [
                candidate
                for candidate in sorted(
                    candidates,
                    key=lambda item: item.route_progress_m,
                    reverse=True,
                )
                if candidate.route_progress_m > 0
            ]
            # Matrix checks many candidate detours in one request. Only ask
            # Directions for a candidate whose routed distance fits the range.
            for start in range(0, len(ordered_candidates), provider.MATRIX_BATCH_SIZE):
                candidate_batch = ordered_candidates[
                    start : start + provider.MATRIX_BATCH_SIZE
                ]
                matrix_distances = provider.driving_distances_to(
                    current_point,
                    [
                        (candidate.stop.longitude, candidate.stop.latitude)
                        for candidate in candidate_batch
                    ],
                )
                for candidate, matrix_distance in zip(candidate_batch, matrix_distances):
                    if matrix_distance is None or matrix_distance > current_range_m:
                        continue
                    candidate_point = (candidate.stop.longitude, candidate.stop.latitude)
                    try:
                        candidate_route = provider.directions([current_point, candidate_point], route_preference)
                    except ORSRouteNotFound:
                        continue
                    if candidate_route.distance_m <= current_range_m:
                        selected = (candidate, candidate_route)
                        break
                if selected is not None:
                    break

            if selected is None:
                # Keep a useful full route and identify the first station even
                # when its routed distance exceeds the currently available range.
                fallback: tuple[StationCandidate, RouteMetrics] | None = None
                for candidate in sorted(candidates, key=lambda item: item.route_progress_m):
                    if candidate.route_progress_m <= 0:
                        continue
                    candidate_point = (candidate.stop.longitude, candidate.stop.latitude)
                    try:
                        candidate_route = provider.directions([current_point, candidate_point], route_preference)
                    except ORSRouteNotFound:
                        continue
                    fallback = (candidate, candidate_route)
                    break
                if fallback is not None:
                    candidate, candidate_route = fallback
                    first_unreachable_stop = candidate.stop.model_copy(update={
                        "sequence": stop_sequence,
                        "leg_distance_m": candidate_route.distance_m,
                        "route_progress_m": progress_before_current_m + candidate.route_progress_m,
                    })
                    additional_range_km = max(0.0, candidate_route.distance_m - current_range_m) / 1000
                    feasibility = RouteFeasibility(
                        status="incomplete",
                        message="The first compatible station is outside the vehicle's current range.",
                        first_unreachable_stop=first_unreachable_stop,
                        next_station_distance_km=candidate_route.distance_m / 1000,
                        additional_range_km=additional_range_km,
                    )
                    legs.append(RouteLeg(
                        sequence=len(legs) + 1,
                        distance_m=candidate_route.distance_m,
                        duration_s=candidate_route.duration_s,
                    ))
                else:
                    feasibility = RouteFeasibility(
                        status="incomplete",
                        message="No compatible station was found along the remaining route.",
                    )
                incomplete_remaining_route = remaining_route
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
            remaining_route = provider.directions([current_point, destination_point], route_preference)
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
                incomplete_remaining_route = remaining_route
        if feasibility.status == "complete":
            final_route = (
                _initial_route
                if _initial_route is not None and not stops
                else provider.directions(route_points, route_preference)
            )
        else:
            reachable_coordinates: list[tuple[float, float]] = []
            for segment in reachable_segments:
                segment_coordinates = segment.geometry.coordinates
                if reachable_coordinates and reachable_coordinates[-1] == segment_coordinates[0]:
                    reachable_coordinates.extend(segment_coordinates[1:])
                else:
                    reachable_coordinates.extend(segment_coordinates)
            if incomplete_remaining_route is not None:
                segment_coordinates = incomplete_remaining_route.geometry.coordinates
                if reachable_coordinates and reachable_coordinates[-1] == segment_coordinates[0]:
                    reachable_coordinates.extend(segment_coordinates[1:])
                else:
                    reachable_coordinates.extend(segment_coordinates)
            if len(reachable_coordinates) < 2:
                reachable_coordinates = (
                    incomplete_remaining_route.geometry.coordinates
                    if incomplete_remaining_route is not None
                    else [current_point, current_point]
                )
            final_route = RouteMetrics(
                geometry=RouteGeometry(type="LineString", coordinates=reachable_coordinates),
                distance_m=sum(segment.distance_m for segment in reachable_segments)
                + (incomplete_remaining_route.distance_m if incomplete_remaining_route is not None else 0),
                duration_s=sum(segment.duration_s for segment in reachable_segments)
                + (incomplete_remaining_route.duration_s if incomplete_remaining_route is not None else 0),
            )
    except ORSRouteNotFound as error:
        raise HTTPException(status_code=422, detail="route_not_found") from error
    except ORSProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="routing_provider_unavailable") from error
    except TripConfigurationError as error:
        raise HTTPException(status_code=503, detail="routing_provider_unavailable") from error

    response = TripPreviewResponse(
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
    if request.route_preference in {"fastest", "shortest"}:
        option = {
            "id": "route-option-1", "attraction_count": 0, "route_labels": [request.route_preference], "feasibility": response.feasibility,
            "vehicle": response.vehicle, "route": response.route, "legs": response.legs,
            "stops": response.stops, "attractions": [],
        }
        response = response.model_copy(update={
            "route_preference": request.route_preference,
            "selected_route_option_id": option["id"],
            "route_options": [TripRouteOption.model_validate(option)],
            "attractions": [],
        })
    return response
