from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.auth.schemas import valid_email, valid_password


class PageQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)
    sort_order: Literal["asc", "desc"] = "desc"


class UserCreateProducer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    brand: str = Field(min_length=1, max_length=120)
    email: str
    password: str

    @field_validator("name", "brand")
    @classmethod
    def trim_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("email")
    @classmethod
    def email_valid(cls, value: str) -> str:
        return valid_email(value)

    @field_validator("password")
    @classmethod
    def password_valid(cls, value: str) -> str:
        return valid_password(value)


class DeactivateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmation: Literal["DELETE"]


def page_response(items: list, stats: dict, page: int, page_size: int, total: int, key: str) -> dict:
    return {key: items, "stats": stats, "pagination": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}}


def account_row(account, include_brand: bool = False) -> dict:
    row = {"id": account.id, "name": account.name, "email": account.email, "status": account.status, "created_at": account.created_at}
    if include_brand:
        row["brand"] = account.brand
    return row


def vehicle_row(vehicle) -> dict:
    return {"id": vehicle.id, "name": vehicle.name, "model": vehicle.model, "type": vehicle.type, "year": vehicle.year, "range_km": vehicle.range_km, "mileage_km": vehicle.mileage_km, "fuel_type": vehicle.fuel_type, "created_at": vehicle.created_at, "updated_at": vehicle.updated_at}
