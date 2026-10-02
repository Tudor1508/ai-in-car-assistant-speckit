import math
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PlaceSelection(StrictRequest):
    label: str = Field(min_length=1, max_length=255)
    latitude: float
    longitude: float
    provider_id: str | None = Field(default=None, max_length=255)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -90 <= value <= 90:
            raise ValueError("Latitude must be a finite WGS84 coordinate")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -180 <= value <= 180:
            raise ValueError("Longitude must be a finite WGS84 coordinate")
        return value


class PlaceSuggestion(PlaceSelection):
    pass


class PlaceCollection(BaseModel):
    places: list[PlaceSuggestion]


class TripPreviewRequest(StrictRequest):
    origin: PlaceSelection
    destination: PlaceSelection
    vehicle_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    current_level_percent: StrictInt = Field(ge=0, le=100)

    @model_validator(mode="after")
    def endpoints_must_differ(self) -> "TripPreviewRequest":
        if (
            self.origin.latitude == self.destination.latitude
            and self.origin.longitude == self.destination.longitude
        ):
            raise ValueError("Origin and destination must be different places")
        return self


class VehicleRangeSummary(BaseModel):
    id: str
    current_level_percent: int
    available_range_km: float
    maximum_range_km: int


class RouteLeg(BaseModel):
    sequence: int
    distance_m: float
    duration_s: float


class RouteStop(BaseModel):
    sequence: int
    provider_id: str | None
    name: str | None
    station_type: Literal["charging", "fuel"]
    latitude: float
    longitude: float
    leg_distance_m: float
    route_progress_m: float

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -90 <= value <= 90:
            raise ValueError("Latitude must be a finite WGS84 coordinate")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -180 <= value <= 180:
            raise ValueError("Longitude must be a finite WGS84 coordinate")
        return value


class RouteGeometry(BaseModel):
    type: Literal["LineString"]
    coordinates: list[tuple[float, float]]

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(
        cls, coordinates: list[tuple[float, float]]
    ) -> list[tuple[float, float]]:
        if len(coordinates) < 2:
            raise ValueError("A route must contain at least two coordinates")
        for longitude, latitude in coordinates:
            if (
                not math.isfinite(longitude)
                or not math.isfinite(latitude)
                or not -180 <= longitude <= 180
                or not -90 <= latitude <= 90
            ):
                raise ValueError("Route coordinates must be finite WGS84 values")
        return coordinates


class RouteMetrics(BaseModel):
    geometry: RouteGeometry
    distance_m: float
    duration_s: float


class RouteFeasibility(BaseModel):
    status: Literal["complete", "incomplete"]
    message: str | None


class TripPreviewResponse(BaseModel):
    feasibility: RouteFeasibility
    vehicle: VehicleRangeSummary
    route: RouteMetrics
    legs: list[RouteLeg]
    stops: list[RouteStop]


class FavoriteRouteCreate(StrictRequest):
    origin: PlaceSelection
    destination: PlaceSelection

    @model_validator(mode="after")
    def endpoints_must_differ(self) -> "FavoriteRouteCreate":
        if (
            self.origin.latitude == self.destination.latitude
            and self.origin.longitude == self.destination.longitude
        ):
            raise ValueError("Origin and destination must be different places")
        return self


class FavoritePlace(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    latitude: float
    longitude: float

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A place label is required")
        return value

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -90 <= value <= 90:
            raise ValueError("Latitude must be a finite WGS84 coordinate")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not math.isfinite(value) or not -180 <= value <= 180:
            raise ValueError("Longitude must be a finite WGS84 coordinate")
        return value


class FavoriteRoute(BaseModel):
    id: str
    origin: FavoritePlace
    destination: FavoritePlace
    created_at: datetime


class FavoriteCollection(BaseModel):
    favorites: list[FavoriteRoute]


class FavoriteItem(BaseModel):
    favorite: FavoriteRoute
