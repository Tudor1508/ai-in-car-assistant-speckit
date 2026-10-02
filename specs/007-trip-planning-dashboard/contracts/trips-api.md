# Trips API Contract

## Conventions

- Base path: `/trips`.
- All endpoints require an active authenticated account. Route preview and favorite creation require the existing CSRF token and strict request-origin validation; preview consumes provider quota even though it does not persist a trip.
- The client uses the existing credentialed `apiRequest` wrapper; it never calls ORS directly.
- Success responses use `{ "data": ... }`. Errors use the shared `{ "error": { "code", "message", "details", "request_id" } }` envelope; optional fields may be absent.
- Provider credentials and provider-internal error details are never returned to clients.
- Coordinates are WGS84 decimal degrees. Application payloads use named `latitude` and `longitude` fields; ORS adapter converts to the provider's `[longitude, latitude]` order.
- Requests reject unknown and server-managed fields. Vehicle ownership, current range, maximum range, propulsion type, and favorite owner are derived or verified by the backend.

## `GET /trips/places?q={query}`

Returns debounced place suggestions through the backend ORS adapter. The query must meet the configured minimum length; results are bounded by configured provider limits.

**200 response**

```json
{
  "data": {
    "places": [
      {
        "label": "Example place, Example region",
        "latitude": 46.77,
        "longitude": 23.59,
        "provider_id": "provider-specific-id"
      }
    ]
  }
}
```

`provider_id` is optional and opaque. The frontend must use a chosen suggestion rather than treating arbitrary unselected text as resolved coordinates. Empty results return an empty `places` list.

## `POST /trips/preview`

Calculates directions and a range-aware route through compatible stations. This operation is authenticated and CSRF-protected. It does not persist a trip, but it consumes provider quota.

**Request**

```json
{
  "origin": {
    "label": "Example origin",
    "latitude": 46.77,
    "longitude": 23.59,
    "provider_id": "provider-specific-id"
  },
  "destination": {
    "label": "Example destination",
    "latitude": 45.75,
    "longitude": 21.23,
    "provider_id": "provider-specific-id"
  },
  "vehicle_id": "32-character-lowercase-hex-id",
  "current_level_percent": 60
}
```

Validation: origin/destination labels must be trimmed and non-empty; coordinates must be finite and within WGS84 bounds; vehicle ID must match the existing opaque vehicle ID form; current level is an integer from 0 to 100. The backend loads the vehicle scoped to the account. It rejects a foreign or unknown vehicle using the same safe not-found response and rejects a vehicle with zero maximum range for preview.

The available first-leg range is `vehicle.range_km * current_level_percent / 100`; later legs use the selected vehicle's saved `range_km` and assume the driver restores the vehicle to full range at each stop. A stop is feasible only when the routed distance to it, including detour, is within that leg's range. Vehicle type determines the station category: charging for electric; fuel for combustion, using its saved fuel type where the provider has compatible data. The number of stops is bounded by server configuration.

**200 response: completed route**

```json
{
  "data": {
    "feasibility": { "status": "complete", "message": null },
    "vehicle": {
      "id": "32-character-lowercase-hex-id",
      "current_level_percent": 60,
      "available_range_km": 240,
      "maximum_range_km": 400
    },
    "route": {
      "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.6, 46.78]] },
      "distance_m": 320000,
      "duration_s": 14400
    },
    "legs": [
      { "sequence": 1, "distance_m": 180000, "duration_s": 8100 },
      { "sequence": 2, "distance_m": 140000, "duration_s": 6300 }
    ],
    "stops": [
      {
        "sequence": 1,
        "provider_id": "osm-or-provider-id",
        "name": "Example station",
        "station_type": "charging",
        "latitude": 46.5,
        "longitude": 23.1,
        "leg_distance_m": 180000,
        "route_progress_m": 180000
      }
    ]
  }
}
```

Geometry and metrics describe the route through all stops. Duration is driving time returned by the route service; charging/refueling dwell time is not included. Optional provider fields may be null when OSM data lacks them.

**200 response: no complete station chain found**

Return `feasibility.status = "incomplete"`, a safe explanation, the best available partial route/legs/stops, and never represent an infeasible direct destination leg as a complete plan. The UI must visually distinguish this result from a complete route.

**Errors**

- `401 authentication_required`: no active session.
- `403 invalid_csrf`: invalid or missing CSRF token on preview or favorite creation.
- `404 vehicle_not_found`: the requested vehicle is unknown or belongs to another account.
- `422 validation_error`: invalid locations, percentage, vehicle fields, or request data.
- `422 route_not_found`: provider reports no route between resolved points.
- `502 routing_provider_unavailable`: provider timeout, rate limit, malformed response, or outage, with no internal details exposed.

## `GET /trips/favorites`

Returns the signed-in account's favorites only, ordered by `created_at` descending and then ID.

**200 response**

```json
{
  "data": {
    "favorites": [
      {
        "id": "32-character-lowercase-hex-id",
        "origin": { "label": "Example origin", "latitude": 46.77, "longitude": 23.59 },
        "destination": { "label": "Example destination", "latitude": 45.75, "longitude": 21.23 },
        "created_at": "2026-10-02T12:00:00Z"
      }
    ]
  }
}
```

An account with no favorites receives an empty list.

## `POST /trips/favorites`

Creates an account-owned favorite from two selected place suggestions. Requires `X-CSRF-Token`; the owner is always derived from the active session. Coordinate and label validation matches place selections in preview. Repeated saves of the same normalized endpoint pair for one account are idempotent and return the existing favorite.

**201 response**: `{ "data": { "favorite": { ...favorite item... } } }` for a new favorite.

**200 response**: same response shape for an existing identical favorite.

## Provider/error mapping

The backend maps real ORS no-result, throttling, timeout, malformed payload, and outage outcomes into documented safe application errors or the `incomplete` feasibility result. Raw provider messages, API keys, request headers, and stack traces are not returned. Integration tests use the configured ORS service through the real backend routes and environment-supplied locations/ranges; they do not inject fake providers, intercept application endpoints, or use fixed provider responses.
