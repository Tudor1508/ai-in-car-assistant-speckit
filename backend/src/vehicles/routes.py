from typing import Annotated

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope
from src.auth.dependencies import get_db, require_account, require_csrf
from src.data.models.account import Account
from src.vehicles.schemas import (
    VehicleCollection,
    VehicleCreate,
    VehicleDeleteResult,
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
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])
VehicleId = Annotated[str, Path(min_length=32, max_length=32, pattern="^[0-9a-f]{32}$")]


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
