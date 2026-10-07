from __future__ import annotations

import math
from datetime import datetime
from typing import Literal
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
    route_preference: Literal["fastest", "shortest", "scenic", "all"] | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_route_preference(cls, value):
        if isinstance(value, dict) and "route_preference" in value and value["route_preference"] is None:
            raise ValueError("Route preference cannot be null")
        return value

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


class TouristAttraction(BaseModel):
    source_id: str | None = None
    name: str | None = None
    category: Literal["attraction", "viewpoint"]
    latitude: float
    longitude: float
    sequence: int
    route_progress_m: float


class RouteRestaurant(BaseModel):
    source_id: str | None = None
    name: str | None = None
    category: Literal["restaurant"] = "restaurant"
    latitude: float
    longitude: float
    sequence: int
    route_progress_m: float


class TripRouteOption(BaseModel):
    id: str
    attraction_count: int
    route_labels: list[Literal["fastest", "shortest", "scenic"]] = Field(default_factory=list)
    feasibility: "RouteFeasibility"
    vehicle: "VehicleRangeSummary"
    route: "RouteMetrics"
    legs: list["RouteLeg"]
    stops: list["RouteStop"]
    attractions: list[TouristAttraction] = Field(default_factory=list)
    restaurants: list[RouteRestaurant] = Field(default_factory=list)


class TripRouteChoice(BaseModel):
    preference: Literal["fastest", "shortest", "scenic"]
    status: Literal["available", "unavailable"]
    route_option_id: str | None = None
    reason: Literal[
        "no_attractions_found", "no_distinct_candidates", "poi_geometry_limit",
        "poi_results_incomplete", "provider_unavailable",
    ] | None = None


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
    first_unreachable_stop: RouteStop | None = None
    next_station_distance_km: float | None = None
    additional_range_km: float | None = None


class TripPreviewResponse(BaseModel):
    feasibility: RouteFeasibility
    vehicle: VehicleRangeSummary
    route: RouteMetrics
    legs: list[RouteLeg]
    stops: list[RouteStop]
    route_preference: Literal["fastest", "shortest", "scenic", "all"] | None = None
    selected_route_option_id: str | None = None
    route_options: list[TripRouteOption] | None = None
    route_choices: list[TripRouteChoice] | None = None
    attractions: list[TouristAttraction] | None = None
    restaurants: list[RouteRestaurant] | None = None


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


class HistoryPlace(PlaceSelection):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class HistoryRouteGeometry(RouteGeometry):
    model_config = ConfigDict(extra="forbid")


class HistoryRouteMetrics(RouteMetrics):
    model_config = ConfigDict(extra="forbid")
    geometry: HistoryRouteGeometry

    @field_validator("distance_m", "duration_s")
    @classmethod
    def validate_metrics(cls, value: float) -> float:
        if not math.isfinite(value) or value < 0:
            raise ValueError("Route metrics must be finite and non-negative")
        return value


class HistoryFeasibility(RouteFeasibility):
    model_config = ConfigDict(extra="forbid")
    first_unreachable_stop: HistoryRouteStop | None = None

    @field_validator("next_station_distance_km", "additional_range_km")
    @classmethod
    def validate_ranges(cls, value: float | None) -> float | None:
        if value is not None and (not math.isfinite(value) or value < 0):
            raise ValueError("Range values must be finite and non-negative")
        return value


class HistoryRouteLeg(RouteLeg):
    model_config = ConfigDict(extra="forbid")

    @field_validator("distance_m", "duration_s")
    @classmethod
    def validate_metrics(cls, value: float) -> float:
        if not math.isfinite(value) or value < 0:
            raise ValueError("Leg metrics must be finite and non-negative")
        return value


class HistoryRouteStop(RouteStop):
    model_config = ConfigDict(extra="forbid")

    @field_validator("leg_distance_m", "route_progress_m")
    @classmethod
    def validate_metrics(cls, value: float) -> float:
        if not math.isfinite(value) or value < 0:
            raise ValueError("Stop metrics must be finite and non-negative")
        return value


class HistoryAttraction(TouristAttraction):
    model_config = ConfigDict(extra="forbid")

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

    @field_validator("route_progress_m")
    @classmethod
    def validate_route_progress(cls, value: float) -> float:
        if not math.isfinite(value) or value < 0:
            raise ValueError("Route progress must be finite and non-negative")
        return value


class HistoryRestaurant(RouteRestaurant):
    model_config = ConfigDict(extra="forbid")

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

    @field_validator("route_progress_m")
    @classmethod
    def validate_route_progress(cls, value: float) -> float:
        if not math.isfinite(value) or value < 0:
            raise ValueError("Route progress must be finite and non-negative")
        return value


class TripHistoryCreate(StrictRequest):
    origin: HistoryPlace
    destination: HistoryPlace
    vehicle_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    current_level_percent: StrictInt = Field(ge=0, le=100)
    route_preference: Literal["fastest", "shortest", "scenic"]
    route: HistoryRouteMetrics
    feasibility: HistoryFeasibility
    legs: list[HistoryRouteLeg]
    stops: list[HistoryRouteStop]
    attractions: list[HistoryAttraction] = Field(default_factory=list)
    restaurants: list[HistoryRestaurant] = Field(default_factory=list)

    @model_validator(mode="after")
    def endpoints_must_differ(self):
        if (self.origin.latitude, self.origin.longitude) == (self.destination.latitude, self.destination.longitude):
            raise ValueError("Origin and destination must be different places")
        return self


class HistoryVehicle(BaseModel):
    id: str
    name: str
    model: str
    type: Literal["combustion", "electric"]
    current_level_percent: int
    available_range_km: float
    maximum_range_km: int


class TripHistoryItem(BaseModel):
    id: str
    origin: HistoryPlace
    destination: HistoryPlace
    created_at: datetime
    route_preference: Literal["fastest", "shortest", "scenic"]
    vehicle: HistoryVehicle
    route: HistoryRouteMetrics
    feasibility: HistoryFeasibility
    legs: list[HistoryRouteLeg]
    stops: list[HistoryRouteStop]
    attractions: list[HistoryAttraction]
    restaurants: list[HistoryRestaurant]


class TripHistorySummary(BaseModel):
    total_trips: int
    total_distance_m: float
    total_duration_s: float


class TripHistoryPagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class TripHistoryCollection(BaseModel):
    trips: list[TripHistoryItem]
    summary: TripHistorySummary
    pagination: TripHistoryPagination


class TripHistoryCreated(BaseModel):
    trip: TripHistoryItem
