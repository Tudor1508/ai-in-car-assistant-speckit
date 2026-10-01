# Vehicle HTTP API Contract

**Status**: Proposed for implementation under approved features 004 and 005 conventions.

## Shared rules

- HTTP/JSON under `/vehicles`; FastAPI-generated OpenAPI 3.1 documents request and response shapes.
- Successful responses use `{ "data": ... }`. Failures use `{ "error": { "code", "message", "details?", "request_id?" } }`.
- Every operation requires an active authenticated session. POST, PATCH, and DELETE additionally require the existing synchronizer CSRF token and strict Origin/Referer validation. The current API client sends credentials and bootstraps/sends CSRF for unsafe calls.
- Creation derives owner from the session. List has no owner parameter. Item queries always filter by both vehicle ID and authenticated account ID.
- Missing and foreign-owned vehicle identifiers produce the same HTTP 404 response with code `vehicle_not_found` and safe message `The requested resource was not found`.
- Invalid bodies or path IDs return HTTP 422 with safe field details. Missing/expired authentication is HTTP 401; failed CSRF/origin validation is HTTP 403. Unexpected errors use the existing generic HTTP 500. The feature adds safe `vehicle_not_found` mapping to the common error handler and preserves other shared error handling.
- `/health` remains HTTP 200 `{ "status": "ok" }`.

## Vehicle response

```json
{
  "id": "0123456789abcdef0123456789abcdef",
  "name": "Daily driver",
  "model": "Audi A5",
  "type": "combustion",
  "year": 2013,
  "range_km": 200,
  "mileage_km": 320000,
  "fuel_type": "diesel",
  "created_at": "2026-10-01T12:00:00Z",
  "updated_at": "2026-10-01T12:00:00Z"
}
```

The response never includes `owner_account_id` or credentials/session data. Electric responses use `"fuel_type": null`; the UI renders “Not applicable”.

## Operations

### `GET /vehicles`

List the current user's vehicles. No request body or account selector.

- **200**: `{ "data": { "vehicles": [Vehicle, ...] } }`, stable order by creation time then ID.
- **401**: no active session.

### `POST /vehicles`

Create one vehicle. Owner is inferred from the active session.

```json
{
  "name": "Daily driver",
  "model": "Audi A5",
  "type": "combustion",
  "year": 2013,
  "range_km": 200,
  "mileage_km": 320000,
  "fuel_type": "diesel"
}
```

- **201**: `{ "data": { "vehicle": Vehicle } }`.
- **422**: missing, extra, malformed, or out-of-range values; combustion fuel is required, electric fuel must be null or omitted.
- **401/403**: missing session or invalid CSRF/origin.

### `GET /vehicles/{vehicle_id}`

Read one vehicle by opaque ID, scoped to the current account.

- **200**: `{ "data": { "vehicle": Vehicle } }`.
- **401**: no active session.
- **404**: absent or not owned by the current account (`vehicle_not_found`).

### `PATCH /vehicles/{vehicle_id}`

Update one or more editable fields. The body must include at least one field and cannot include `id`, owner, or timestamps. Validate the complete merged vehicle after applying the changes.

```json
{ "mileage_km": 325000 }
```

To switch an electric vehicle to combustion, include a valid fuel type in the same patch. To switch combustion to electric, send `"fuel_type": null` in the same patch. Reject updates that would leave type and fuel applicability inconsistent.

- **200**: `{ "data": { "vehicle": Vehicle } }`.
- **401/403**: missing session or invalid CSRF/origin.
- **404**: absent or not owned (`vehicle_not_found`).
- **422**: empty body, unknown/immutable fields, invalid values, or invalid merged type/fuel combination.

### `DELETE /vehicles/{vehicle_id}`

Permanently remove one vehicle scoped to the current account.

- **200**: `{ "data": { "status": "deleted" } }`.
- **401/403**: missing session or invalid CSRF/origin.
- **404**: absent or not owned (`vehicle_not_found`).

## Validation summary

- `name`, `model`: trimmed, required, 1–80 characters.
- `type`: `combustion` or `electric`.
- `year`: integer 1886 through current UTC calendar year, inclusive.
- `range_km`, `mileage_km`: nonnegative integer kilometers; booleans and fractional values are rejected.
- `fuel_type`: combustion requires `petrol`, `diesel`, `lpg`, `cng`, or `other`; electric requires null (or omitted on create).
- Unknown fields are rejected. IDs, owner fields, and timestamps are server-managed.
