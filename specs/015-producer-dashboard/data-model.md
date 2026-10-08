# Data Model: Producer Dashboard

## Existing entities

### Account

The existing account row stores `role`, `status`, and nullable `brand`. For role `producer`, trimmed `brand` is the reporting company identity. The report never returns account IDs, names, or emails of vehicle owners.

### Vehicle

Extend the existing vehicle row:

| Field | Type | Nullability | Meaning |
|---|---|---|---|
| `brand` | string(120) | nullable | Manufacturer/brand. Null is preserved for legacy rows until the owner supplies a value. New vehicle API creates require a non-empty brand. |
| `archived_at` | UTC datetime | nullable | Null means the vehicle is active. Non-null records a removal time and keeps the record for historical aggregation. |

Existing fields `name`, `model`, `type`, `mileage_km`, and `created_at` keep their existing meanings. `mileage_km` is never used for reported trip distance. Supported `type` values remain `electric` and `combustion`.

### TripHistory

The existing route history row remains the trip source. New `vehicle_snapshot` JSON includes the selected vehicle's `brand` in addition to existing vehicle details. The dashboard uses `TripHistory.distance_m`, endpoints, `vehicle_id`, owner ID internally for distinct-user aggregation, and `created_at`. Owner ID and vehicle IDs are not returned in report data.

## Producer Report (response DTO)

- `companyName`: the Producer's own brand string.
- `usersCount`: distinct user accounts with at least one active vehicle of the brand.
- `activeUsersCount`: subset of those users whose account status is active.
- `vehiclesCount`: active vehicles of the brand.
- `historicalVehiclesCount`: active plus archived brand vehicles retained in storage.
- `usedVehiclesCount`: distinct active brand vehicles with one or more attributable saved trips.
- `historicalUsedVehiclesCount`: distinct active or archived brand vehicles with attributable saved trips.
- `tripsCount`: all attributable saved trip rows for the brand.
- `totalDistanceKm`: sum of those trip distances in meters divided by 1,000.
- `vehicleTypes[]`: one entry for each existing type (`electric`, `combustion`) with active count, historical count, used count, and trip count.
- `fleetTimeline[]`: monthly point with active fleet and cumulative registered fleet; omit/return empty where there is insufficient creation/archive history to make a useful trend.
- `routes[]`: route pair with display labels, trip count, distinct user count, distinct vehicle count, total distance, and sorted per-vehicle usage counts/distance.
- `vehicleTopRoutes[]`: the most frequent saved route for each vehicle with that vehicle's trip count and distance.
- `recentTrips[]`: newest saved trip metadata (date, route, vehicle name/model/type, distance); no owner data or IDs.

## Aggregation Rules

1. Normalize Producer brand and vehicle brand by trimming whitespace and case-folding for comparison.
2. Vehicle active set is matching brand and `archived_at IS NULL`; historical set includes all matching rows.
3. Count users only for accounts with role `user` who own an active matching vehicle; `activeUsersCount` filters this set by account status.
4. Match trips to a brand vehicle by `vehicle_id`. For new snapshot data, use snapshot `brand`; for old snapshots, use the retained vehicle row's brand. Normalize before matching. Trips with neither association are not attributed.
5. Kilometers use route distances only: `sum(distance_m) / 1000`.
6. Route keys are origin/destination labels trimmed and case-folded in the saved direction; reverse direction is a separate route.
7. All rankings are deterministic: descending count/distance, then normalized labels/vehicle name.

## Migration

Add nullable `brand`, nullable `archived_at`, and a brand/archive/creation index to `vehicles`. Merge both current Alembic heads (`0006_trip_history`, `0008_vehicle_image_upload`) in this revision. No backfill is performed. Existing live vehicles remain active but unassociated until edited. Existing physical deletions cannot be reconstructed.
