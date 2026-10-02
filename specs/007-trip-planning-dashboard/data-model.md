# Data Model: Trip Planning Dashboard

## TripFavorite

Represents one saved origin/destination pair owned by one authenticated account. A favorite stores the selected place values so it can be reused across sessions without repeating geocoding.

| Field | Type | Required | Constraints / meaning |
|---|---|---:|---|
| `id` | opaque string | yes | Server-generated 32-character lowercase hexadecimal identifier. |
| `owner_account_id` | opaque string | yes | Foreign key to `accounts.id`; derived from the authenticated session and never accepted from the client. |
| `origin_label` | string | yes | Trimmed, non-empty display name returned by the selected place suggestion; bounded to 255 characters. |
| `origin_latitude` | decimal | yes | WGS84 latitude from the selected place; between -90 and 90 degrees, normalized to six decimal places. |
| `origin_longitude` | decimal | yes | WGS84 longitude from the selected place; between -180 and 180 degrees, normalized to six decimal places. |
| `destination_label` | string | yes | Trimmed, non-empty display name returned by the selected place suggestion; bounded to 255 characters. |
| `destination_latitude` | decimal | yes | WGS84 latitude from the selected place; between -90 and 90 degrees, normalized to six decimal places. |
| `destination_longitude` | decimal | yes | WGS84 longitude from the selected place; between -180 and 180 degrees, normalized to six decimal places. |
| `created_at` | UTC datetime | yes | Set by the server on initial save; list order is newest first, then ID. |

A database uniqueness constraint over owner and normalized origin/destination coordinates makes repeated saves of the same pair idempotent for that account. An owner index supports listing. Deleting an account cascades to its favorites. No favorite delete operation is included in this feature's user-facing scope.

## Relationships and ownership

- One account owns zero or more favorites.
- Every read and create operation is scoped to the signed-in account; the owner ID is not client-controlled.
- Favorites contain place names and coordinates only. They do not store vehicle, current energy percentage, route geometry, stop recommendations, or trip history.

## Transient data (not persisted)

### TripPlanDraft

The current planner inputs held in Redux while the account is active:

- selected origin and destination place suggestions (display label and WGS84 coordinates);
- selected owned vehicle ID;
- current fuel/battery percentage, integer from 0 to 100;
- place-search and preview loading/error states.

Clear the draft when `authCleared` is dispatched. A zero-range vehicle (`range_km <= 0`) cannot produce a range-aware trip preview and receives a user-facing validation message.

### RoutePreview

The last successful or range-incomplete preview held in Redux until replaced or the account is cleared:

- provider route geometry as a GeoJSON LineString;
- total route distance in meters and estimated duration in seconds;
- feasibility status (`complete` or `incomplete`) and user-safe explanatory message;
- ordered route legs and station stops; each stop assumes the driver restores the vehicle to its saved maximum range before the next leg;
- each stop's OSM/provider identifier when supplied, name, compatible station category, coordinates, and detour/leg distance;
- calculated current range and selected vehicle maximum range for explaining why stops are required.

A preview is an estimate from provider route and station data. It is not a guarantee of vehicle consumption, station availability, or successful charging/refueling.

### PlaceSuggestion and StationCandidate

These are transient provider results. A PlaceSuggestion carries a display label and validated coordinates. A StationCandidate carries an OSM/provider identifier when available, label, compatible fuel/charging category, coordinates, and route progress/distance used during planning. Neither is stored as user data unless the user saves the selected origin/destination as a favorite.

## State transitions

```text
Planner: empty -> editing -> previewing -> complete preview | incomplete-range preview | recoverable error
Favorite: absent -> saved for account -> selected into planner draft
Authentication: account active -> authCleared -> trip draft, preview, and favorites cleared from client state
```
