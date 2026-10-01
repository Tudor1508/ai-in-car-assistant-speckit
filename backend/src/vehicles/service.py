import secrets

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.data.models.vehicle import Vehicle
from src.vehicles.schemas import VehicleCreate, VehicleFields, VehiclePatch


def _vehicle_or_404(db: Session, owner_id: str, vehicle_id: str) -> Vehicle:
    vehicle = db.scalar(
        select(Vehicle).where(
            Vehicle.id == vehicle_id,
            Vehicle.owner_account_id == owner_id,
        )
    )
    if vehicle is None:
        raise HTTPException(status_code=404, detail="vehicle_not_found")
    return vehicle


def list_owned_vehicles(db: Session, owner_id: str) -> list[Vehicle]:
    return list(
        db.scalars(
            select(Vehicle)
            .where(Vehicle.owner_account_id == owner_id)
            .order_by(Vehicle.created_at, Vehicle.id)
        ).all()
    )


def get_owned_vehicle(db: Session, owner_id: str, vehicle_id: str) -> Vehicle:
    return _vehicle_or_404(db, owner_id, vehicle_id)


def create_owned_vehicle(db: Session, owner_id: str, body: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(
        id=secrets.token_hex(16),
        owner_account_id=owner_id,
        **body.model_dump(),
    )
    db.add(vehicle)
    db.flush()
    return vehicle


def update_owned_vehicle(
    db: Session, owner_id: str, vehicle_id: str, body: VehiclePatch
) -> Vehicle:
    vehicle = _vehicle_or_404(db, owner_id, vehicle_id)
    changes = body.model_dump(exclude_unset=True)
    candidate = {
        "name": vehicle.name,
        "model": vehicle.model,
        "type": vehicle.type,
        "year": vehicle.year,
        "range_km": vehicle.range_km,
        "mileage_km": vehicle.mileage_km,
        "fuel_type": vehicle.fuel_type,
        **changes,
    }
    try:
        validated = VehicleFields.model_validate(candidate)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="validation_error") from exc
    for field, value in validated.model_dump().items():
        setattr(vehicle, field, value)
    db.flush()
    return vehicle


def delete_owned_vehicle(db: Session, owner_id: str, vehicle_id: str) -> None:
    vehicle = _vehicle_or_404(db, owner_id, vehicle_id)
    db.delete(vehicle)
    db.flush()
