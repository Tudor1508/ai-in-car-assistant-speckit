export type VehicleType = "electric" | "combustion";

export type VehicleTypeStat = {
  vehicleType: VehicleType;
  vehiclesCount: number;
  historicalVehiclesCount: number;
  usedVehiclesCount: number;
  tripsCount: number;
};

export type FleetTimelinePoint = {
  month: string;
  activeVehicles: number;
  allTimeVehicles: number;
};

export type VehicleRouteStat = {
  name: string;
  model: string;
  tripsCount: number;
  totalDistanceKm: number;
};

export type RouteStat = {
  origin: string;
  destination: string;
  tripsCount: number;
  uniqueUsersCount: number;
  vehicleCount: number;
  totalDistanceKm: number;
  vehicles: VehicleRouteStat[];
};

export type RecentTripStat = {
  createdAt: string;
  origin: string;
  destination: string;
  vehicleName: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  distanceKm: number;
};

export type VehicleTopRouteStat = {
  vehicleName: string;
  vehicleModel: string;
  origin: string;
  destination: string;
  tripsCount: number;
  totalDistanceKm: number;
};

export type ProducerReport = {
  companyName: string;
  usersCount: number;
  activeUsersCount: number;
  vehiclesCount: number;
  historicalVehiclesCount: number;
  usedVehiclesCount: number;
  historicalUsedVehiclesCount: number;
  tripsCount: number;
  totalDistanceKm: number;
  vehicleTypes: VehicleTypeStat[];
  fleetTimeline: FleetTimelinePoint[];
  routes: RouteStat[];
  vehicleTopRoutes: VehicleTopRouteStat[];
  recentTrips: RecentTripStat[];
};
