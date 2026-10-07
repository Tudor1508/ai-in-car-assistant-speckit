import secrets

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.data.models.vehicle import Vehicle
from src.vehicles.image_provider import resolve_vehicle_image
from src.vehicles.schemas import VehicleCreate, VehicleFields, VehiclePatch


_IMAGE_COLUMN_MAP = {
    "provider": "image_provider",
    "file_title": "image_file_title",
    "image_url": "image_url",
    "file_page_url": "image_page_url",
    "creator": "image_creator",
    "license_name": "image_license_name",
    "license_url": "image_license_url",
    "match_kind": "image_match_kind",
}


def _image_values(name: str, model: str, year: int, file_title: str | None) -> dict:
    image = resolve_vehicle_image(name, model, year, file_title)
    if image is None:
        return {column: None for column in _IMAGE_COLUMN_MAP.values()}
    response = image.as_response()
    return {column: response[key] for key, column in _IMAGE_COLUMN_MAP.items()}


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
    values = body.model_dump(exclude={"image_file_title"})
    image_values = _image_values(body.name, body.model, body.year, body.image_file_title)
    vehicle = Vehicle(
        id=secrets.token_hex(16),
        owner_account_id=owner_id,
        **values,
        **image_values,
    )
    db.add(vehicle)
    db.flush()
    return vehicle


def update_owned_vehicle(
    db: Session, owner_id: str, vehicle_id: str, body: VehiclePatch
) -> Vehicle:
    vehicle = _vehicle_or_404(db, owner_id, vehicle_id)
    changes = body.model_dump(exclude_unset=True)
    image_file_title = changes.pop("image_file_title", None)
    changes.pop("discard_uploaded_image", None)
    image_selection_was_sent = "image_file_title" in body.model_fields_set
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
    identity_changed = (
        validated.name != vehicle.name
        or validated.model != vehicle.model
        or validated.year != vehicle.year
    )
    keep_uploaded_image = (
        vehicle.image_provider == "user_upload"
        and not body.discard_uploaded_image
    )
    for field, value in validated.model_dump(exclude={"image_file_title"}).items():
        setattr(vehicle, field, value)

    if body.discard_uploaded_image:
        vehicle.image_upload_data = None
        vehicle.image_upload_mime = None
        vehicle.image_provider = None
        for column in _IMAGE_COLUMN_MAP.values():
            setattr(vehicle, column, None)
    if (identity_changed or image_selection_was_sent) and not keep_uploaded_image:
        for field, value in _image_values(
            vehicle.name, vehicle.model, vehicle.year, image_file_title
        ).items():
            setattr(vehicle, field, value)
    db.flush()
    return vehicle


def set_owned_vehicle_image(
    db: Session, owner_id: str, vehicle_id: str, image_data: bytes, image_mime: str
) -> Vehicle:
    vehicle = _vehicle_or_404(db, owner_id, vehicle_id)
    vehicle.image_provider = "user_upload"
    vehicle.image_file_title = None
    vehicle.image_url = None
    vehicle.image_page_url = None
    vehicle.image_creator = None
    vehicle.image_license_name = None
    vehicle.image_license_url = None
    vehicle.image_match_kind = None
    vehicle.image_upload_data = image_data
    vehicle.image_upload_mime = image_mime
    db.flush()
    return vehicle


def delete_owned_vehicle(db: Session, owner_id: str, vehicle_id: str) -> None:
    vehicle = _vehicle_or_404(db, owner_id, vehicle_id)
    db.delete(vehicle)
    db.flush()
