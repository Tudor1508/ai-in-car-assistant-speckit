# Admin HTTP API Contract

**Status**: Documents the implemented admin API.

## Shared Rules

- HTTP/JSON under `/admin`; FastAPI-generated OpenAPI 3.1 describes request and response shapes.
- Successes use `{ "data": ... }`; errors use `{ "error": { "code", "message", "details?", "request_id?" } }`.
- Every route requires an active server-managed session and `role == "admin"`; a frontend guard is not authorization.
- Every mutation also requires existing CSRF-token and strict Origin checks.
- Validation uses Pydantic query/body models with unknown or unsupported filter/sort values rejected. Safe error mapping follows the shared handler; no exception detail, hash, submitted password, session ID, owner ID, or singleton-admin value is returned.
- Collection routes return only the requested page plus global section aggregates. Filters and sorting are applied before page slicing.
- `page` is one-based (default `1`); `page_size` defaults to `25` and accepts values from `1` through `100`. The UI initially offers `10`, `25`, and `50` rows per page.
- Pagination metadata `total` and `total_pages` counts records matching the current filters. Section statistics are global and independent of filters and page. Zero matches gives `total: 0`, `total_pages: 0`, and an empty item list.
- Text filtering is case-insensitive partial matching; enum filtering is exact; numeric and UTC timestamp filters use inclusive from/to boundaries. Multiple filters combine with AND. Sorting supports an allowlist per section, `asc`/`desc`, and a stable ID tie-break.
- `/health`, `/auth/*`, and owner-scoped `/vehicles/*` contracts are unchanged.

## Safe Row Shapes

User row:

```json
{ "id": "opaque-account-id", "name": "Ana Popescu", "email": "ana@example.com", "status": "active", "created_at": "2026-10-06T10:30:00Z" }
```

User rows contain only role `user`. Producer rows add `brand` and are role `producer` by collection membership. Vehicle rows contain existing vehicle fields (`id`, `name`, `model`, `type`, `year`, `range_km`, `mileage_km`, `fuel_type`, `created_at`, `updated_at`) and omit `owner_account_id`.

Every list response includes pagination metadata:

```json
{ "page": 1, "page_size": 25, "total": 57, "total_pages": 3 }
```

## Operations

### `GET /admin/users`

List ordinary-user accounts, including active and disabled accounts.

Query parameters: `page`, `page_size`, `name`, `email`, `status`, `created_from`, `created_to`, `sort_by` (`name`, `email`, `status`, `created_at`), and `sort_order` (`asc` or `desc`). Text filters are case-insensitive contains; status is exact; timestamps use inclusive UTC boundaries.

**200**:

```json
{
  "data": {
    "users": [
      { "id": "opaque-account-id", "name": "Ana Popescu", "email": "ana@example.com", "status": "active", "created_at": "2026-10-06T10:30:00Z" }
    ],
    "stats": { "total": 61, "by_status": { "active": 57, "disabled": 4 } },
    "pagination": { "page": 1, "page_size": 25, "total": 57, "total_pages": 3 }
  }
}
```

`stats` describes all user-role rows; pagination `total` describes only rows matching the supplied filters.

### `DELETE /admin/users/{account_id}`

Deactivate an ordinary-user account only after explicit dashboard confirmation. Confirmation is an explicit request body value so the backend can reject an unconfirmed operation; the target user's password is not requested.

```json
{ "confirmation": "DELETE" }
```

- **200**: `{ "data": { "status": "disabled" } }`; mark the account disabled and revoke its active sessions in the same transaction.
- **401**: no active account session.
- **403**: caller is not admin, or CSRF/origin check fails.
- **404**: identifier does not refer to an ordinary-user account; use a safe response without revealing another role's records.
- **422**: missing/incorrect confirmation value.

The operation does not physically delete the account or its vehicles/favorites.

### `GET /admin/vehicles`

List all application vehicles, regardless of owner, in stable sort order.

Query parameters: `page`, `page_size`, `name`, `model`, `type`, `year_from`, `year_to`, `range_km_from`, `range_km_to`, `mileage_km_from`, `mileage_km_to`, `fuel_type`, `created_from`, `created_to`, `sort_by` (`name`, `model`, `type`, `year`, `range_km`, `mileage_km`, `fuel_type`, `created_at`), and `sort_order` (`asc` or `desc`). Text filters are case-insensitive contains; categorical filters exact; numeric/date bounds inclusive.

**200**:

```json
{
  "data": {
    "vehicles": [
      { "id": "opaque-vehicle-id", "name": "Daily driver", "model": "A5", "type": "combustion", "year": 2013, "range_km": 200, "mileage_km": 320000, "fuel_type": "diesel", "created_at": "2026-10-01T12:00:00Z", "updated_at": "2026-10-01T12:00:00Z" }
    ],
    "stats": { "total": 112, "by_type": { "combustion": 84, "electric": 28 } },
    "pagination": { "page": 1, "page_size": 25, "total": 112, "total_pages": 5 }
  }
}
```

There are no admin vehicle mutation operations. Vehicle results do not include owner IDs or a manufacturer field.

### `GET /admin/producers`

List producer-role accounts, including disabled producers. Legacy producers without a known brand have `brand: null` and are counted in the unassigned-brand group.

Query parameters: `page`, `page_size`, `name`, `email`, `brand`, `status`, `created_from`, `created_to`, `sort_by` (`name`, `email`, `brand`, `status`, `created_at`), and `sort_order` (`asc` or `desc`). Text filters are case-insensitive contains; status is exact; timestamps use inclusive UTC boundaries.

**200**:

```json
{
  "data": {
    "producers": [
      { "id": "opaque-account-id", "name": "Dealer Group", "email": "contact@example.com", "brand": "Dacia", "status": "active", "created_at": "2026-10-06T10:30:00Z" }
    ],
    "stats": { "total": 18, "by_brand": [{ "brand": "Dacia", "count": 8 }, { "brand": "Ford", "count": 9 }, { "brand": null, "count": 1 }] },
    "pagination": { "page": 1, "page_size": 25, "total": 18, "total_pages": 1 }
  }
}
```

### `POST /admin/producers`

Create an active producer account with a required free-text brand.

```json
{ "name": "Dealer Group", "brand": "Dacia", "email": "contact@example.com", "password": "ExamplePass1!" }
```

- **201**: `{ "data": { "producer": { "id", "name", "email", "brand", "role": "producer", "status": "active", "created_at" } } }`.
- **401**: no active account session.
- **403**: caller is not admin, or CSRF/origin check fails.
- **409**: normalized email already exists; safe code `email_unavailable`.
- **422**: invalid/missing/extra values; common safe field-location details only.

Validation: name trimmed and 1–120 characters; brand trimmed, non-empty free text, and at most 120 characters matching the account model and request schema; email follows existing `valid_email` and normalized uniqueness rules (max 320 characters); password follows `valid_password` (at least 8 characters with an uppercase letter, number, and special character). Hash using the existing password verifier function. Successful creation must permit existing `/auth/login` with email/password.

## Authorization Matrix

| Caller | Read Users | Deactivate User | Read Vehicles | Read Producers | Create Producer |
|---|---:|---:|---:|---:|---:|
| Unauthenticated | 401 | 401 | 401 | 401 | 401 |
| `user` | 403 | 403 | 403 | 403 | 403 |
| `producer` | 403 | 403 | 403 | 403 | 403 |
| `admin` | 200 | 200 with valid confirmation | 200 | 200 | 201 with valid input |

The singleton administrator provisioning script is not an HTTP operation and is not exposed in this API.


