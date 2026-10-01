# Vehicle Data Model

## Vehicle

Represents one car in a single account's garage.

| Field | Type | Required | Constraints / meaning |
|---|---|---:|---|
| `id` | opaque string | yes | Server-generated, unique, 32-character identifier; never accepted from create input. |
| `owner_account_id` | opaque string | yes | Foreign key to the owning account; derived from the authenticated session, never accepted from the caller. |
| `name` | string | yes | Trimmed, 1–80 characters. User-facing garage name. |
| `model` | string | yes | Trimmed, 1–80 characters. User-entered model label. |
| `type` | enum string | yes | Exactly `combustion` or `electric`. |
| `year` | integer | yes | From 1886 through the current UTC calendar year, inclusive. |
| `range_km` | integer | yes | Nonnegative whole kilometers. |
| `mileage_km` | integer | yes | Nonnegative whole kilometers. |
| `fuel_type` | enum string or null | conditional | For combustion: `petrol`, `diesel`, `lpg`, `cng`, or `other`. For electric: null. |
| `created_at` | UTC datetime | yes | Set by the server on creation. |
| `updated_at` | UTC datetime | yes | Set by the server at creation and each successful update. |

The database enforces required ownership, allowed type/fuel values, nonnegative distance values, and the type/fuel applicability rule with foreign-key and check constraints. API validation additionally enforces string trimming/length, current-year bounds, and partial-update semantics. `PATCH` validates the fully merged record, so changing `type` to electric requires clearing combustion fuel and changing to combustion requires a valid fuel type.

## Relationships and lifecycle

- One account owns zero or more vehicles; each vehicle has exactly one owner.
- The list operation returns only the current account's records, in stable ascending `created_at`, then `id` order.
- Vehicle deletion removes that row. Account deactivation does not delete vehicle rows; disabled accounts cannot access them through authenticated routes.
- There is no product-defined maximum number of vehicles.
- No battery energy-consumption attribute or service reminder is stored by this feature.

## State changes

```text
Create: absent -> active garage record
Update: active record -> active record with validated merged fields
Delete: active record -> absent
Account deactivation: account active -> disabled; vehicle records retained and inaccessible to that account until any later reactivation
```
