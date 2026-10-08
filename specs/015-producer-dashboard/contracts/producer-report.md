# API Contract: Producer Report

## Request

`GET /producer/report`

- Authentication: existing signed session cookie, sent with credentials.
- Authorization: current account must be active and have role `producer`.
- Parameters/body: none.
- Frontend base URL may include the deployment's existing API prefix.

## Success

HTTP 200, existing `data` envelope. Types use lower-case server enums, distance values are kilometers as JSON numbers, and zero is represented as numeric `0`.

```json
{
  "data": {
    "companyName": "Tesla",
    "usersCount": 12,
    "activeUsersCount": 8,
    "vehiclesCount": 15,
    "historicalVehiclesCount": 18,
    "usedVehiclesCount": 10,
    "historicalUsedVehiclesCount": 12,
    "tripsCount": 42,
    "totalDistanceKm": 12750.5,
    "vehicleTypes": [
      { "vehicleType": "electric", "vehiclesCount": 15, "historicalVehiclesCount": 18, "usedVehiclesCount": 10, "tripsCount": 42 },
      { "vehicleType": "combustion", "vehiclesCount": 0, "historicalVehiclesCount": 0, "usedVehiclesCount": 0, "tripsCount": 0 }
    ],
    "fleetTimeline": [
      { "month": "2026-10", "activeVehicles": 15, "allTimeVehicles": 18 }
    ],
    "routes": [
      {
        "origin": "Bucharest",
        "destination": "Brasov",
        "tripsCount": 14,
        "uniqueUsersCount": 7,
        "vehicleCount": 8,
        "totalDistanceKm": 2800,
        "vehicles": [
          { "name": "Tesla", "model": "Model 3", "tripsCount": 5, "totalDistanceKm": 1000 }
        ]
      }
    ],
    "vehicleTopRoutes": [
      { "vehicleName": "Tesla", "vehicleModel": "Model 3", "origin": "Bucharest", "destination": "Brasov", "tripsCount": 5, "totalDistanceKm": 1000 }
    ],
    "recentTrips": [
      {
        "createdAt": "2026-10-08T09:30:00Z",
        "origin": "Bucharest",
        "destination": "Brasov",
        "vehicleName": "Tesla",
        "vehicleModel": "Model 3",
        "vehicleType": "electric",
        "distanceKm": 200
      }
    ]
  }
}
```

Arrays are empty when no matching records exist. Type rows are still present for the supported vehicle types with zero counts. `fleetTimeline` may be empty when no useful time series is available. Route and recent-trip arrays contain no user name, email, account ID, or vehicle ID.

## Errors

Use the existing safe error envelope and established error middleware:

- `401 authentication_required`: absent or expired session.
- `403 forbidden`: authenticated non-Producer.
- `409 producer_brand_not_configured`: Producer account has no non-empty brand; response carries a user-safe message.
- `500 internal_error`: generic safe failure; internal exception details are not exposed.

## Vehicle Contract Changes

- `POST /vehicles`: accepts required trimmed `brand` (1–120 characters).
- `PATCH /vehicles/{id}`: accepts optional trimmed non-empty `brand` (1–120 characters); permits legacy unbranded vehicles to become associated.
- Vehicle response adds `brand: string | null`.
- `DELETE /vehicles/{id}` retains the established success envelope/status but archives the active vehicle. Subsequent owner list/detail/mutation requests treat it as not found.
