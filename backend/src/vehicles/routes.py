from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response, status
from sqlalchemy.orm import Session

from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope
from src.auth.dependencies import get_db, require_account, require_csrf
from src.data.models.account import Account
from src.vehicles import image_provider
from src.vehicles.schemas import (
    VehicleCollection,
    VehicleCreate,
    VehicleDeleteResult,
    VehicleImagePreview,
    VehicleItem,
    VehiclePatch,
    VehicleResponse,
)
from src.vehicles.service import (
    create_owned_vehicle,
    delete_owned_vehicle,
    get_owned_vehicle,
    list_owned_vehicles,
    update_owned_vehicle,
    set_owned_vehicle_image,
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])
VehicleId = Annotated[str, Path(min_length=32, max_length=32, pattern="^[0-9a-f]{32}$")]
MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024
_IMAGE_SIGNATURES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


async def _read_vehicle_image(request: Request) -> tuple[bytes, str]:
    declared_mime = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if declared_mime not in _IMAGE_SIGNATURES:
        raise HTTPException(status_code=415, detail="unsupported_vehicle_image")
    chunks: list[bytes] = []
    total_size = 0
    async for chunk in request.stream():
        total_size += len(chunk)
        if total_size > MAX_VEHICLE_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="vehicle_image_too_large")
        chunks.append(chunk)
    image_data = b"".join(chunks)
    if not image_data or not _IMAGE_SIGNATURES[declared_mime](image_data):
        raise HTTPException(status_code=415, detail="invalid_vehicle_image")
    return image_data, declared_mime


@router.get(
    "",
    response_model=SuccessEnvelope[VehicleCollection],
    responses=common_error_responses(),
)
def list_vehicles(
    db: Session = Depends(get_db), account: Account = Depends(require_account)
):
    vehicles = list_owned_vehicles(db, account.id)
    return success_envelope({"vehicles": vehicles})


@router.get(
    "/image-preview",
    response_model=SuccessEnvelope[VehicleImagePreview],
    responses=common_error_responses(),
)
def preview_vehicle_image(
    name: str = Query(min_length=1, max_length=80),
    model: str = Query(min_length=1, max_length=80),
    year: int = Query(ge=1886, le=datetime.now(timezone.utc).year),
    account: Account = Depends(require_account),
):
    clean_name = name.strip()
    clean_model = model.strip()
    if not clean_name or not clean_model:
        raise HTTPException(status_code=422, detail="validation_error")
    image = image_provider.search_vehicle_image(clean_name, clean_model, year)
    return success_envelope({
        "status": "matched" if image is not None else "fallback",
        "image": image.as_response() if image is not None else None,
    })


@router.post(
    "/{vehicle_id}/image",
    response_model=SuccessEnvelope[VehicleItem],
    responses=common_error_responses(),
)
async def upload_vehicle_image(
    vehicle_id: VehicleId,
    request: Request,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
    _csrf=Depends(require_csrf),
):
    get_owned_vehicle(db, account.id, vehicle_id)
    image_data, image_mime = await _read_vehicle_image(request)
    vehicle = set_owned_vehicle_image(
        db, account.id, vehicle_id, image_data, image_mime
    )
    return success_envelope({"vehicle": vehicle})


@router.get(
    "/{vehicle_id}/image-content",
    responses=common_error_responses(),
)
def read_vehicle_image(
    vehicle_id: VehicleId,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
):
    vehicle = get_owned_vehicle(db, account.id, vehicle_id)
    if vehicle.image_provider != "user_upload" or not vehicle.image_upload_data:
        raise HTTPException(status_code=404, detail="vehicle_image_not_found")
    return Response(
        content=vehicle.image_upload_data,
        media_type=vehicle.image_upload_mime,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.get(
    "/{vehicle_id}",
    response_model=SuccessEnvelope[VehicleItem],
    responses=common_error_responses(),
)
def read_vehicle(
    vehicle_id: VehicleId,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
):
    vehicle = get_owned_vehicle(db, account.id, vehicle_id)
    return success_envelope({"vehicle": vehicle})


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessEnvelope[VehicleItem],
    responses=common_error_responses(),
)
def create_vehicle(
    body: VehicleCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
    _csrf=Depends(require_csrf),
):
    vehicle = create_owned_vehicle(db, account.id, body)
    return success_envelope({"vehicle": vehicle})


@router.patch(
    "/{vehicle_id}",
    response_model=SuccessEnvelope[VehicleItem],
    responses=common_error_responses(),
)
def patch_vehicle(
    vehicle_id: VehicleId,
    body: VehiclePatch,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
    _csrf=Depends(require_csrf),
):
    vehicle = update_owned_vehicle(db, account.id, vehicle_id, body)
    return success_envelope({"vehicle": vehicle})


@router.delete(
    "/{vehicle_id}",
    response_model=SuccessEnvelope[VehicleDeleteResult],
    responses=common_error_responses(),
)
def remove_vehicle(
    vehicle_id: VehicleId,
    db: Session = Depends(get_db),
    account: Account = Depends(require_account),
    _csrf=Depends(require_csrf),
):
    delete_owned_vehicle(db, account.id, vehicle_id)
    return success_envelope({"status": "deleted"})
