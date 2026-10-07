from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_serializer, field_validator, model_validator

VehicleType = Literal["combustion", "electric"]
FuelType = Literal["petrol", "diesel", "lpg", "cng", "other"]


class VehicleFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    type: VehicleType
    year: StrictInt = Field(ge=1886)
    range_km: StrictInt = Field(ge=0)
    mileage_km: StrictInt = Field(ge=0)
    fuel_type: FuelType | None = None
    image_file_title: str | None = Field(default=None, max_length=255)

    @field_validator("name", "model")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        if len(value) > 80:
            raise ValueError("Must be 80 characters or fewer")
        return value

    @field_validator("image_file_title")
    @classmethod
    def validate_image_file_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value.startswith("File:") or len(value) <= len("File:"):
            raise ValueError("Image selection must be a Commons file title")
        if "\n" in value or "\r" in value or "https://" in value.lower():
            raise ValueError("Image selection must be a Commons file title")
        return value

    @field_validator("year")
    @classmethod
    def year_not_in_future(cls, value: int) -> int:
        if value > datetime.now(timezone.utc).year:
            raise ValueError("Year cannot be in the future")
        return value

    @model_validator(mode="after")
    def fuel_matches_type(self):
        if self.type == "combustion" and self.fuel_type is None:
            raise ValueError("Combustion vehicles require a fuel type")
        if self.type == "electric" and self.fuel_type is not None:
            raise ValueError("Electric vehicles cannot have a fuel type")
        return self


class VehicleCreate(VehicleFields):
    pass


class VehiclePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    type: VehicleType | None = None
    year: StrictInt | None = Field(default=None, ge=1886)
    range_km: StrictInt | None = Field(default=None, ge=0)
    mileage_km: StrictInt | None = Field(default=None, ge=0)
    fuel_type: FuelType | None = None
    image_file_title: str | None = Field(default=None, max_length=255)
    discard_uploaded_image: bool = False

    @field_validator("name", "model")
    @classmethod
    def trim_required_text(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("This field cannot be null")
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        if len(value) > 80:
            raise ValueError("Must be 80 characters or fewer")
        return value

    @field_validator("year")
    @classmethod
    def year_not_in_future(cls, value: int | None) -> int | None:
        if value is not None and value > datetime.now(timezone.utc).year:
            raise ValueError("Year cannot be in the future")
        return value

    @field_validator("image_file_title")
    @classmethod
    def validate_image_file_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value.startswith("File:") or len(value) <= len("File:"):
            raise ValueError("Image selection must be a Commons file title")
        if "\n" in value or "\r" in value or "https://" in value.lower():
            raise ValueError("Image selection must be a Commons file title")
        return value

    @model_validator(mode="after")
    def at_least_one_change(self):
        if not self.model_fields_set:
            raise ValueError("At least one vehicle field is required")
        if any(
            getattr(self, field) is None
            for field in self.model_fields_set
            if field not in {"fuel_type", "image_file_title"}
        ):
            raise ValueError("Vehicle fields cannot be null")
        return self


class VehicleImageResponse(BaseModel):
    provider: Literal["wikimedia_commons"]
    file_title: str
    image_url: str
    file_page_url: str
    creator: str
    license_name: str
    license_url: str
    match_kind: Literal["exact", "similar"]


class UploadedVehicleImageResponse(BaseModel):
    provider: Literal["user_upload"]
    image_url: str
    match_kind: Literal["uploaded"]


class VehicleImagePreview(BaseModel):
    status: Literal["matched", "fallback"]
    image: VehicleImageResponse | None


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    model: str
    type: VehicleType
    year: int
    range_km: int
    mileage_km: int
    fuel_type: FuelType | None
    image: VehicleImageResponse | UploadedVehicleImageResponse | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_utc(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class VehicleItem(BaseModel):
    vehicle: VehicleResponse


class VehicleCollection(BaseModel):
    vehicles: list[VehicleResponse]


class VehicleDeleteResult(BaseModel):
    status: Literal["deleted"]
