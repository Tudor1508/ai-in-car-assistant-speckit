from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.data.models.account import Account
from src.data.models.trip_history import TripHistory
from src.data.models.vehicle import Vehicle
from src.producer.schemas import (
    FleetTimelinePoint,
    ProducerReport,
    RecentTripStat,
    RouteStat,
    VehicleRouteStat,
    VehicleTopRouteStat,
    VehicleTypeStat,
)


SUPPORTED_TYPES = ("electric", "combustion")


def _normalized(value: str | None) -> str:
    return (value or "").strip().casefold()


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _fleet_timeline(vehicles: list[Vehicle]) -> list[FleetTimelinePoint]:
    if len(vehicles) < 2:
        return []
    created = [_utc(vehicle.created_at) for vehicle in vehicles if vehicle.created_at]
    if len(created) < 2:
        return []
    today = datetime.now(timezone.utc)
    first_year, first_month = min(created).year, min(created).month
    current_year, current_month = today.year, today.month
    month_index = current_year * 12 + current_month - (first_year * 12 + first_month) + 1
    start_index = max(0, month_index - 12)
    points: list[FleetTimelinePoint] = []
    for offset in range(start_index, month_index):
        index = first_year * 12 + first_month - 1 + offset
        year, month_zero = divmod(index, 12)
        month = month_zero + 1
        end = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=timezone.utc)
        all_time = sum(1 for vehicle in vehicles if vehicle.created_at and _utc(vehicle.created_at) < end)
        active = sum(
            1 for vehicle in vehicles
            if vehicle.created_at and _utc(vehicle.created_at) < end
            and (vehicle.archived_at is None or _utc(vehicle.archived_at) >= end)
        )
        points.append(FleetTimelinePoint(
            month=f"{year:04d}-{month:02d}",
            activeVehicles=active,
            allTimeVehicles=all_time,
        ))
    return points


def get_producer_report(db: Session, producer: Account) -> ProducerReport:
    brand = (producer.brand or "").strip()
    normalized_brand = brand.casefold()
    if not normalized_brand:
        raise HTTPException(status_code=409, detail="producer_brand_not_configured")

    normalized_brand_upper = brand.upper()
    brand_match = func.upper(func.trim(Vehicle.brand)) == normalized_brand_upper
    vehicles = list(db.scalars(select(Vehicle).where(brand_match).order_by(Vehicle.created_at, Vehicle.id)).all())
    vehicle_by_id = {vehicle.id: vehicle for vehicle in vehicles}
    active_vehicles = [vehicle for vehicle in vehicles if vehicle.archived_at is None]
    active_vehicle_ids = {vehicle.id for vehicle in active_vehicles}
    historical_vehicle_ids = set(vehicle_by_id)

    owner_ids = {vehicle.owner_account_id for vehicle in active_vehicles}
    owners = {}
    if owner_ids:
        owners = {
            account.id: account
            for account in db.scalars(select(Account).where(Account.id.in_(owner_ids), Account.role == "user")).all()
        }
    users_count = len(owners)
    active_users_count = sum(1 for account in owners.values() if account.status == "active")

    snapshot_brand = func.upper(func.trim(TripHistory.vehicle_snapshot["brand"].as_string()))
    trip_rows = db.execute(
        select(TripHistory, Vehicle)
        .join(Vehicle, Vehicle.id == TripHistory.vehicle_id)
        .where(or_(brand_match, snapshot_brand == normalized_brand_upper))
        .order_by(TripHistory.created_at.desc(), TripHistory.id.asc())
    ).all()
    # Snapshot brand preserves attribution if a vehicle's brand is later edited.
    # Legacy rows with no snapshot brand use the retained vehicle row.
    trips = [
        (trip, vehicle)
        for trip, vehicle in trip_rows
        if _normalized((trip.vehicle_snapshot or {}).get("brand") or vehicle.brand) == normalized_brand
        and vehicle.id in historical_vehicle_ids
    ]

    used_vehicle_ids = {vehicle.id for _, vehicle in trips}
    active_used_vehicle_ids = used_vehicle_ids & active_vehicle_ids
    total_distance_m = sum(float(trip.distance_m) for trip, _ in trips)

    type_stats: list[VehicleTypeStat] = []
    for vehicle_type in SUPPORTED_TYPES:
        matching_active = [vehicle for vehicle in active_vehicles if vehicle.type == vehicle_type]
        matching_all = [vehicle for vehicle in vehicles if vehicle.type == vehicle_type]
        type_trip_rows = [(trip, vehicle) for trip, vehicle in trips if vehicle.type == vehicle_type]
        type_used = {vehicle.id for _, vehicle in type_trip_rows}
        type_stats.append(VehicleTypeStat(
            vehicleType=vehicle_type,
            vehiclesCount=len(matching_active),
            historicalVehiclesCount=len(matching_all),
            usedVehiclesCount=len(type_used & active_vehicle_ids),
            tripsCount=len(type_trip_rows),
        ))

    route_groups: dict[tuple[str, str], dict] = {}
    for trip, vehicle in trips:
        origin_key = " ".join(trip.origin_label.strip().split()).casefold()
        destination_key = " ".join(trip.destination_label.strip().split()).casefold()
        route_key = (origin_key, destination_key)
        route = route_groups.setdefault(route_key, {
            "origin": trip.origin_label.strip(),
            "destination": trip.destination_label.strip(),
            "trips": 0,
            "users": set(),
            "vehicles": {},
            "distance_m": 0.0,
        })
        route["trips"] += 1
        route["users"].add(trip.owner_account_id)
        route["distance_m"] += float(trip.distance_m)
        vehicle_use = route["vehicles"].setdefault(vehicle.id, {
            "vehicleId": vehicle.id,
            "name": (trip.vehicle_snapshot or {}).get("name") or vehicle.name,
            "model": (trip.vehicle_snapshot or {}).get("model") or vehicle.model,
            "trips": 0,
            "distance_m": 0.0,
        })
        vehicle_use["trips"] += 1
        vehicle_use["distance_m"] += float(trip.distance_m)

    routes = []
    vehicle_top_routes: dict[str, dict] = {}
    for route in route_groups.values():
        vehicle_rows = sorted(
            route["vehicles"].values(),
            key=lambda item: (-item["trips"], -item["distance_m"], item["name"].casefold(), item["model"].casefold()),
        )
        routes.append(RouteStat(
            origin=route["origin"],
            destination=route["destination"],
            tripsCount=route["trips"],
            uniqueUsersCount=len(route["users"]),
            vehicleCount=len(route["vehicles"]),
            totalDistanceKm=route["distance_m"] / 1000,
            vehicles=[VehicleRouteStat(
                name=item["name"], model=item["model"], tripsCount=item["trips"], totalDistanceKm=item["distance_m"] / 1000,
            ) for item in vehicle_rows],
        ))
        for vehicle_id, item in route["vehicles"].items():
            candidate = {
                "vehicleName": item["name"],
                "vehicleModel": item["model"],
                "origin": route["origin"],
                "destination": route["destination"],
                "trips": item["trips"],
                "distance_m": item["distance_m"],
            }
            current = vehicle_top_routes.get(vehicle_id)
            if current is None or (candidate["trips"], candidate["distance_m"]) > (current["trips"], current["distance_m"]):
                vehicle_top_routes[vehicle_id] = candidate
    routes.sort(key=lambda item: (-item.tripsCount, -item.totalDistanceKm, item.origin.casefold(), item.destination.casefold()))
    top_vehicle_routes = [VehicleTopRouteStat(
        vehicleName=item["vehicleName"],
        vehicleModel=item["vehicleModel"],
        origin=item["origin"],
        destination=item["destination"],
        tripsCount=item["trips"],
        totalDistanceKm=item["distance_m"] / 1000,
    ) for item in sorted(
        vehicle_top_routes.values(),
        key=lambda item: (-item["trips"], -item["distance_m"], item["vehicleName"].casefold(), item["vehicleModel"].casefold()),
    )]

    recent = [RecentTripStat(
        createdAt=_utc(trip.created_at),
        origin=trip.origin_label,
        destination=trip.destination_label,
        vehicleName=(trip.vehicle_snapshot or {}).get("name") or vehicle.name,
        vehicleModel=(trip.vehicle_snapshot or {}).get("model") or vehicle.model,
        vehicleType=(trip.vehicle_snapshot or {}).get("type") or vehicle.type,
        distanceKm=float(trip.distance_m) / 1000,
    ) for trip, vehicle in trips[:20]]

    return ProducerReport(
        companyName=brand,
        usersCount=users_count,
        activeUsersCount=active_users_count,
        vehiclesCount=len(active_vehicles),
        historicalVehiclesCount=len(vehicles),
        usedVehiclesCount=len(active_used_vehicle_ids),
        historicalUsedVehiclesCount=len(used_vehicle_ids),
        tripsCount=len(trips),
        totalDistanceKm=total_distance_m / 1000,
        vehicleTypes=type_stats,
        fleetTimeline=_fleet_timeline(vehicles),
        routes=routes[:10],
        vehicleTopRoutes=top_vehicle_routes,
        recentTrips=recent,
    )
