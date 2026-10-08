# Research: Producer Dashboard

## Existing sources of truth

- Producer company name is stored on `Account.brand`; the account API's public auth DTO does not expose the brand.
- Vehicles are owner-managed records in `vehicles`, currently with no brand or archive field. Vehicle `name` and `model` are distinct user-entered display fields and cannot safely be treated as manufacturer identity.
- `TripHistory` is the persisted route source. It stores owner account ID, vehicle ID, a vehicle snapshot, origin/destination labels, saved route distance in meters, and creation time.
- Trip previews and favorites are not trips. The user must explicitly save the selected trip. This preexisting rule remains unchanged.
- Existing producers and current vehicles may have null brand. User chose no inferred backfill; an owner must edit the vehicle and supply brand.
- Existing vehicle deletion is physical. User approved preserving historical vehicle records, so deletion becomes timestamped archival and active vehicle APIs hide archived records.

## Authorization and API conventions

- Authentication uses the existing secure session cookie and current-account dependencies, not JWT. The new report depends on the existing authenticated account and a Producer role check.
- FastAPI routers use safe `data` success envelopes and safe `error` envelopes. Frontend calls use `apiRequest` and credentials cookies.
- Admin exposes a local light/dark mode toggle persisted under `drivewise-admin-theme`; the app-wide providers are dark-only. Producer will reuse that persisted preference/toggle behavior in a role-specific layout, leaving ordinary account pages and the admin design intact.
- A chart library is not installed. Use MUI and CSS conic-gradient for the vehicle-type donut; render fleet timeline and route ranking with MUI progress/layout primitives.

## Migration chain

- Current revision files form two branches: the trip-history branch ends at `0006_trip_history`, while image support continues to `0008_vehicle_image_upload`.
- The feature migration must set `down_revision` to both current heads, merging them while adding `vehicles.brand` and `vehicles.archived_at`; verify Alembic reports one head afterward.

## Resolved behavior

- Company match is trimmed and case-insensitive on both sides (`upper(trim(vehicle.brand)) == upper(trim(account.brand))`).
- Active vehicles have `archived_at IS NULL`; all-time counts include both active and archived brand vehicles.
- Route/trip statistics include only history rows attributable to brand vehicles and exclude owner PII. Kilometers equal `sum(distance_m) / 1000`.
- New trip snapshots retain brand. Existing trip snapshots without brand use the current retained vehicle brand as a fallback; trips whose vehicle cannot be attributed are excluded.
- The dashboard reports only current supported types, Electric and Combustion; no Hybrid data or migration is introduced.
- No PDF button is displayed because no PDF generation/print feature exists on this branch.

## Compatibility risks to verify

- Existing vehicle form validation and API response types must accept `brand`; brand is required for new creates and can be added on legacy edits.
- Soft archival must keep owner-facing lists/details/image operations and admin vehicle listings active-only, while already saved trip history remains readable.
- Admin theme behavior must remain visually and functionally equivalent after sharing its preference/toggle helper.
- Before rollout, already physically deleted vehicles and their possible brand cannot be recovered. This is disclosed in the feature spec.
