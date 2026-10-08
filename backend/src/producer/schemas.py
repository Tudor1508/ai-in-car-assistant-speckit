from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


VehicleType = Literal["electric", "combustion"]


class VehicleTypeStat(BaseModel):
    vehicleType: VehicleType
    vehiclesCount: int
    historicalVehiclesCount: int
    usedVehiclesCount: int
    tripsCount: int


class FleetTimelinePoint(BaseModel):
    month: str
    activeVehicles: int
    allTimeVehicles: int


class VehicleRouteStat(BaseModel):
    name: str
    model: str
    tripsCount: int
    totalDistanceKm: float


class RouteStat(BaseModel):
    origin: str
    destination: str
    tripsCount: int
    uniqueUsersCount: int
    vehicleCount: int
    totalDistanceKm: float
    vehicles: list[VehicleRouteStat]


class VehicleTopRouteStat(BaseModel):
    vehicleName: str
    vehicleModel: str
    origin: str
    destination: str
    tripsCount: int
    totalDistanceKm: float


class RecentTripStat(BaseModel):
    createdAt: datetime
    origin: str
    destination: str
    vehicleName: str
    vehicleModel: str
    vehicleType: VehicleType
    distanceKm: float


class ProducerReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    companyName: str
    usersCount: int
    activeUsersCount: int
    vehiclesCount: int
    historicalVehiclesCount: int
    usedVehiclesCount: int
    historicalUsedVehiclesCount: int
    tripsCount: int
    totalDistanceKm: float
    vehicleTypes: list[VehicleTypeStat]
    fleetTimeline: list[FleetTimelinePoint]
    routes: list[RouteStat]
    vehicleTopRoutes: list[VehicleTopRouteStat]
    recentTrips: list[RecentTripStat]
