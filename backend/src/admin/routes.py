import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.admin.dependencies import require_admin
from src.admin.schemas import DeactivateUserRequest, UserCreateProducer, account_row, page_response, vehicle_row
from src.auth.dependencies import get_db, require_csrf
from src.auth.passwords import hash_password
from src.auth.sessions import revoke_all_sessions
from src.data.models.account import Account, utc_now
from src.data.models.vehicle import Vehicle
from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope

router = APIRouter(prefix="/admin", tags=["admin"])


def _account_collection(db: Session, role: str, page: int, page_size: int, sort_by: str, sort_order: str, name: str | None, email: str | None, brand: str | None, status: str | None, created_from: datetime | None, created_to: datetime | None, key: str):
    base = select(Account).where(Account.role == role)
    if name: base = base.where(Account.name.ilike(f"%{name}%"))
    if email: base = base.where(Account.email.ilike(f"%{email}%"))
    if brand is not None: base = base.where(Account.brand.ilike(f"%{brand}%"))
    if status: base = base.where(Account.status == status)
    if created_from: base = base.where(Account.created_at >= created_from)
    if created_to: base = base.where(Account.created_at <= created_to)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    columns = {"name": Account.name, "email": Account.email, "brand": Account.brand, "status": Account.status, "created_at": Account.created_at}
    ordering = columns[sort_by].asc() if sort_order == "asc" else columns[sort_by].desc()
    rows = db.scalars(base.order_by(ordering, Account.id.asc()).offset((page - 1) * page_size).limit(page_size)).all()
    global_total = db.scalar(select(func.count()).select_from(Account).where(Account.role == role)) or 0
    if role == "user":
        active = db.scalar(select(func.count()).select_from(Account).where(Account.role == role, Account.status == "active")) or 0
        stats = {"total": global_total, "by_status": {"active": active, "disabled": global_total - active}}
    else:
        groups = db.execute(select(Account.brand, func.count()).where(Account.role == role).group_by(Account.brand).order_by(Account.brand)).all()
        stats = {"total": global_total, "by_brand": [{"brand": brand_value, "count": count} for brand_value, count in groups]}
    return page_response([account_row(row, include_brand=role == "producer") for row in rows], stats, page, page_size, total, key)


def _common_query(page: int, page_size: int, sort_order: str, sort_by: str, allowed: set[str], name: str | None, email: str | None, brand: str | None, status: str | None, created_from: datetime | None, created_to: datetime | None, role: str, key: str, db: Session):
    if sort_by not in allowed:
        raise HTTPException(status_code=422, detail="validation_error")
    return _account_collection(db, role, page, page_size, sort_by, sort_order, name, email, brand, status, created_from, created_to, key)


@router.get("/users", response_model=SuccessEnvelope[dict], responses=common_error_responses())
def users(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100), name: str | None = None, email: str | None = None, status: Literal["active", "disabled"] | None = None, created_from: datetime | None = None, created_to: datetime | None = None, sort_by: Literal["name", "email", "status", "created_at"] = "created_at", sort_order: Literal["asc", "desc"] = "desc", db: Session = Depends(get_db), _admin: Account = Depends(require_admin)):
    return success_envelope(_common_query(page, page_size, sort_order, sort_by, {"name", "email", "status", "created_at"}, name, email, None, status, created_from, created_to, "user", "users", db))


@router.delete("/users/{account_id}", response_model=SuccessEnvelope[dict], responses=common_error_responses())
def deactivate_user(account_id: str, body: DeactivateUserRequest, db: Session = Depends(get_db), _admin: Account = Depends(require_admin), _csrf=Depends(require_csrf)):
    account = db.scalar(select(Account).where(Account.id == account_id, Account.role == "user"))
    if account is None:
        raise HTTPException(status_code=404, detail="not_found")
    account.status = "disabled"
    account.updated_at = utc_now()
    revoke_all_sessions(db, account.id)
    return success_envelope({"status": "disabled"})


@router.get("/producers", response_model=SuccessEnvelope[dict], responses=common_error_responses())
def producers(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100), name: str | None = None, email: str | None = None, brand: str | None = None, status: Literal["active", "disabled"] | None = None, created_from: datetime | None = None, created_to: datetime | None = None, sort_by: Literal["name", "email", "brand", "status", "created_at"] = "created_at", sort_order: Literal["asc", "desc"] = "desc", db: Session = Depends(get_db), _admin: Account = Depends(require_admin)):
    return success_envelope(_common_query(page, page_size, sort_order, sort_by, {"name", "email", "brand", "status", "created_at"}, name, email, brand, status, created_from, created_to, "producer", "producers", db))


@router.post("/producers", status_code=201, response_model=SuccessEnvelope[dict], responses=common_error_responses())
def create_producer(body: UserCreateProducer, response: Response, db: Session = Depends(get_db), _admin: Account = Depends(require_admin), _csrf=Depends(require_csrf)):
    account = Account(id=uuid.uuid4().hex, name=body.name, brand=body.brand, email=body.email, email_normalized=body.email.casefold(), password_hash=hash_password(body.password), role="producer", status="active")
    db.add(account)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="email_unavailable") from None
    return success_envelope({"producer": {**account_row(account), "role": "producer"}})


@router.get("/vehicles", response_model=SuccessEnvelope[dict], responses=common_error_responses())
def vehicles(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100), name: str | None = None, model: str | None = None, type: Literal["combustion", "electric"] | None = None, year_from: int | None = None, year_to: int | None = None, range_km_from: int | None = None, range_km_to: int | None = None, mileage_km_from: int | None = None, mileage_km_to: int | None = None, fuel_type: Literal["petrol", "diesel", "lpg", "cng", "other"] | None = None, created_from: datetime | None = None, created_to: datetime | None = None, sort_by: Literal["name", "model", "type", "year", "range_km", "mileage_km", "fuel_type", "created_at"] = "created_at", sort_order: Literal["asc", "desc"] = "desc", db: Session = Depends(get_db), _admin: Account = Depends(require_admin)):
    query = select(Vehicle)
    if name: query = query.where(Vehicle.name.ilike(f"%{name}%"))
    if model: query = query.where(Vehicle.model.ilike(f"%{model}%"))
    if type: query = query.where(Vehicle.type == type)
    if fuel_type: query = query.where(Vehicle.fuel_type == fuel_type)
    if created_from: query = query.where(Vehicle.created_at >= created_from)
    if created_to: query = query.where(Vehicle.created_at <= created_to)
    for col, lower, upper in [(Vehicle.year, year_from, year_to), (Vehicle.range_km, range_km_from, range_km_to), (Vehicle.mileage_km, mileage_km_from, mileage_km_to)]:
        if lower is not None: query = query.where(col >= lower)
        if upper is not None: query = query.where(col <= upper)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    allowed = {"name": Vehicle.name, "model": Vehicle.model, "type": Vehicle.type, "year": Vehicle.year, "range_km": Vehicle.range_km, "mileage_km": Vehicle.mileage_km, "fuel_type": Vehicle.fuel_type, "created_at": Vehicle.created_at}
    ordering = allowed[sort_by].asc() if sort_order == "asc" else allowed[sort_by].desc()
    rows = db.scalars(query.order_by(ordering, Vehicle.id.asc()).offset((page - 1) * page_size).limit(page_size)).all()
    count = db.scalar(select(func.count()).select_from(Vehicle)) or 0
    groups = db.execute(select(Vehicle.type, func.count()).group_by(Vehicle.type)).all()
    stats = {"total": count, "by_type": {"combustion": 0, "electric": 0}}
    stats["by_type"].update(dict(groups))
    return success_envelope(page_response([vehicle_row(row) for row in rows], stats, page, page_size, total, "vehicles"))
