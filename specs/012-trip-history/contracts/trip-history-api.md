# Trip History API Contract

## Conventions

- Base path: `/trips`.
- Both operations require an active account through the existing session cookie. The backend derives the owner from that session and does not accept an owner ID from the request.
- The create operation requires `X-CSRF-Token` and existing request-origin validation. The list operation is read-only and does not require CSRF.
- Successful responses use `{ "data": ... }`; errors use the existing safe `{ "error": { "code", "message", "details", "request_id" } }` envelope.
- Coordinates are finite WGS84 latitude/longitude fields. Persisted route coordinates retain the existing route format `[longitude, latitude]`.
- Unknown request fields are rejected. Vehicle identity is checked against the authenticated account; vehicle labels/type are read from that vehicle and snapshotted by the backend.
- No owner account ID, credential, or provider-internal details are returned.

## `POST /trips/history`

Creates one history row from the selected Trip Plan preview. A preview alone is not saved. Explicit repeated saves create distinct journeys. The selected route is stored as submitted after strict validation; the backend does **not** request a new route from ORS, so history retains the geometry the user selected. The backend verifies the vehicle belongs to the active account and derives its display snapshot and range summary from the owned vehicle and submitted current-level percentage.

**Request**

```json
{
  "origin": { "label": "Selected origin", "latitude": 46.77, "longitude": 23.59 },
  "destination": { "label": "Selected destination", "latitude": 45.75, "longitude": 21.23 },
  "vehicle_id": "32-character-lowercase-hex-id",
  "current_level_percent": 60,
  "route_preference": "fastest",
  "route": {
    "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.60, 46.78]] },
    "distance_m": 320000,
    "duration_s": 14400
  },
  "feasibility": { "status": "complete", "message": null },
  "legs": [{ "sequence": 1, "distance_m": 320000, "duration_s": 14400 }],
  "stops": [],
  "attractions": [],
  "restaurants": []
}
```

`route_preference` is the selected route (`fastest`, `shortest`, or `scenic`); `all` is not a saveable preference. An incomplete `feasibility` is accepted and remains labeled incomplete in subsequent reads. The API validates nested geometry, all stop/POI coordinates, enum values, finite/non-negative metrics, endpoint distinction, and current-level bounds. The backend sets the trip ID and `created_at`.

**201 response**

```json
{
  "data": {
    "trip": {
      "id": "32-character-lowercase-hex-id",
      "origin": { "label": "Selected origin", "latitude": 46.77, "longitude": 23.59 },
      "destination": { "label": "Selected destination", "latitude": 45.75, "longitude": 21.23 },
      "created_at": "2026-10-07T12:00:00Z",
      "route_preference": "fastest",
      "vehicle": {
        "id": "32-character-lowercase-hex-id",
        "name": "Example vehicle",
        "model": "Example model",
        "type": "electric",
        "current_level_percent": 60,
        "available_range_km": 240,
        "maximum_range_km": 400
      },
      "route": {
        "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.60, 46.78]] },
        "distance_m": 320000,
        "duration_s": 14400
      },
      "feasibility": { "status": "complete", "message": null },
      "legs": [{ "sequence": 1, "distance_m": 320000, "duration_s": 14400 }],
      "stops": [],
      "attractions": [],
      "restaurants": []
    }
  }
}
```

An incomplete route returns and persists `feasibility.status = "incomplete"` and the corresponding route feasibility details. The response omits `owner_account_id` and any cost value.

**Errors**: `401 authentication_required`; `403 invalid_csrf`; `404 vehicle_not_found` for a missing or non-owned vehicle; `422 validation_error` for malformed fields or coordinates. Use the common safe response envelope.

## `GET /trips/history`

Returns one page plus totals over the authenticated owner's entire history. No route provider call is made.

**Query**

| Parameter | Default | Allowed |
|---|---:|---|
| `page` | 1 | Integer ≥ 1 |
| `page_size` | 10 | Integer 1–10 |
| `sort_order` | `desc` | `desc` (newest first), `asc` (oldest first) |

The server orders by `created_at` in the selected direction and then `id ASC` to keep equal timestamps stable. It applies owner filtering before counting, aggregation, offset, and limit.

**200 response**

```json
{
  "data": {
    "trips": [
      {
        "id": "32-character-lowercase-hex-id",
        "origin": { "label": "Selected origin", "latitude": 46.77, "longitude": 23.59 },
        "destination": { "label": "Selected destination", "latitude": 45.75, "longitude": 21.23 },
        "created_at": "2026-10-07T12:00:00Z",
        "route_preference": "fastest",
        "vehicle": {
          "id": "32-character-lowercase-hex-id",
          "name": "Example vehicle",
          "model": "Example model",
          "type": "electric",
          "current_level_percent": 60,
          "available_range_km": 240,
          "maximum_range_km": 400
        },
        "route": {
          "geometry": { "type": "LineString", "coordinates": [[23.59, 46.77], [23.60, 46.78]] },
          "distance_m": 320000,
          "duration_s": 14400
        },
        "feasibility": { "status": "complete", "message": null },
        "legs": [{ "sequence": 1, "distance_m": 320000, "duration_s": 14400 }],
        "stops": [],
        "attractions": [],
        "restaurants": []
      }
    ],
    "summary": {
      "total_trips": 12,
      "total_distance_m": 1200000,
      "total_duration_s": 54000
    },
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 12,
      "total_pages": 2
    }
  }
}
```

`trips` includes at most 10 items. Summary is independent of page and sort and includes explicitly saved incomplete routes. Empty history returns `trips: []`, all summary totals as zero, and `total_pages: 0`, matching the current admin pagination helper. The UI presents the empty state without page navigation. If rows change and a requested page is now beyond the end, the response returns the current total/page metadata and an empty item list; the UI moves to the last valid page (or page 1 when empty) and reloads.

**Errors**: `401 authentication_required`; `422 validation_error` for invalid query values. Each user's history is isolated by server-side session ownership.
