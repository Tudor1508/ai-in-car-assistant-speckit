# Feature Specification: Producer Dashboard

**Feature Branch**: `015-producer-dashboard`
**Created**: 2026-10-08
**Status**: Approved
**Input**: User request and clarifications for a responsive Producer partner-insights dashboard.

## Clarifications

- Vehicles are associated with a Producer by normalized `Vehicle.brand` matched to the Producer account's existing `Account.brand`.
- Existing vehicles keep a null brand until their owner edits and supplies it. Names/models are not inferred as brands.
- The vehicle types remain the two currently supported types: Electric and Combustion. Hybrid is not introduced.
- Producer theme selection reuses the Admin light/dark preference and toggle behavior.
- Vehicle removal is archived (soft deletion) so historical fleet totals remain available; no separate deleted-vehicle metric/table is displayed.
- The existing trip-history rule remains: only explicitly saved trips count. Route previews/favorites do not count. A successful save stores the calculated route distance and is included in reports.

## User Scenarios & Testing

### User Story 1 - Review brand insights (Priority: P1)

As a Producer, I want a protected dashboard for my brand so that I can understand its vehicles and usage without seeing vehicle owners' personal information.

**Independent Test**: Sign in as a Producer with a configured brand and compare the report against active/archived vehicles and saved trips of that normalized brand; verify other roles and unauthenticated requests receive no report data.

**Acceptance Scenarios**:

1. **Given** an authenticated Producer with a brand, **When** they open `/producer`, **Then** they see only their brand's dashboard and profile navigation, their brand name, responsive statistics, vehicle types, fleet overview, route statistics, and saved-trip history.
2. **Given** an unauthenticated visitor, **When** they open the Producer dashboard or request its report, **Then** they are sent to sign-in in the UI and receive an authentication error from the API.
3. **Given** an authenticated non-Producer, **When** they open a Producer page or call its API, **Then** the UI redirects to their default destination and the API denies access.
4. **Given** vehicles whose brand differs only by case or surrounding whitespace, **When** a Producer loads the dashboard, **Then** those vehicles are included only for the matching Producer brand.
5. **Given** a Producer account with no configured brand, **When** the dashboard loads, **Then** it presents a clear configuration error and does not return another company's data.

### User Story 2 - Understand fleet and trip usage (Priority: P1)

As a Producer, I want accurate fleet, trip, route, and distance summaries so that I can identify how vehicles of my brand are used.

**Independent Test**: Create active and archived brand vehicles, explicitly save trips with known distances and route pairs, and verify summary totals, type breakdowns, per-route/per-vehicle statistics, and recent trip entries.

**Acceptance Scenarios**:

1. **Given** active and archived vehicles, **When** the report is calculated, **Then** it separately reports active fleet and all-time registered vehicles without a deleted-vehicle category.
2. **Given** trips saved with known `distance_m`, **When** kilometrajul raportat is displayed, **Then** it equals the sum of those route distances divided by 1,000, never odometer mileage or range.
3. **Given** trips with matching origin/destination pairs, **When** routes are ranked, **Then** the dashboard shows trip count, total route distance, distinct vehicles and users, plus per-vehicle usage, without exposing names/emails of owners.
4. **Given** a route preview or favorite without a saved history row, **When** the report is calculated, **Then** it does not count as a trip.
5. **Given** no matching vehicles or saved trips, **When** the dashboard loads, **Then** it shows zero values and clear empty states without fabricated records.

### User Story 3 - Use dashboard in both themes (Priority: P2)

As a Producer, I want the dashboard and profile to follow the existing Admin light/dark theme preference so that all text and charts remain readable.

**Independent Test**: Toggle the existing light/dark preference on Producer pages and verify the dashboard, profile, cards, charts, tables, loading/error/empty states, and navigation remain readable and the preference persists across dashboard/profile navigation and reload.

**Acceptance Scenarios**:

1. **Given** either stored theme preference, **When** a Producer opens dashboard or profile, **Then** MUI theme colors are applied consistently.
2. **Given** a Producer switches theme, **When** they navigate between dashboard and profile or reload, **Then** the chosen mode remains selected using the existing Admin preference.
3. **Given** a report request is pending or fails, **When** the Producer views the page, **Then** an accessible loading state or safe error with Retry is shown.

## Edge Cases

- Producer has a null/blank brand, no matching vehicles, no saved trips, or only archived matching vehicles.
- Vehicle brand contains leading/trailing spaces or differs in letter case from the Producer brand.
- A user's older vehicle has no brand; it is excluded until edited, without guessing from name/model.
- A vehicle is archived after trips were saved; its trip records remain attributable to the archived vehicle and brand.
- Trips have identical route labels with different capitalization/spacing; route grouping is case-insensitive after trimming while preserving a display label.
- Trip history references a vehicle whose row is unavailable; the report omits unattributable trips rather than guessing its brand.
- API is unauthorized, fails, or returns no records; errors remain safe and retryable.
- Layout is used on narrow screens and with keyboard/screen reader.

## Requirements

### Functional Requirements

- **FR-001**: The application MUST provide `/producer` and `/producer/profile` and limit Producer navigation to these two destinations.
- **FR-002**: The Producer pages MUST require an authenticated account with role `producer`; backend report access MUST independently enforce the role using the existing session-auth pattern.
- **FR-003**: `GET /producer/report` MUST scope every vehicle and trip to the authenticated Producer's brand by trimmed, case-insensitive matching of `Vehicle.brand` to `Account.brand`.
- **FR-004**: The report MUST not include owner names, emails, account IDs, or other personal data.
- **FR-005**: The report MUST return company name, distinct users with brand vehicles, active users, active vehicles, all-time registered vehicles, used vehicles, saved trip count, total distance in kilometers, vehicle-type statistics, route statistics with per-vehicle summaries, recent trip summaries, and fleet-over-time data when records support it.
- **FR-006**: Active vehicle counts MUST exclude archived vehicles. All-time vehicle counts MUST include current and archived vehicles. The dashboard MUST NOT expose a deleted-vehicle category.
- **FR-007**: Vehicle removal MUST archive rather than physically remove the vehicle row. Archived vehicles MUST disappear from owner-facing active vehicle lists/details/mutations but remain available to Producer historical aggregation.
- **FR-008**: New vehicle creation MUST require an explicit brand; vehicle editing MUST allow an owner to add or change brand. Existing null brands MUST remain unassociated until edited, with no name/model inference.
- **FR-009**: The app MUST preserve the existing Electric and Combustion vehicle types; Hybrid MUST NOT be added as part of this feature.
- **FR-010**: Total distance MUST be `sum(TripHistory.distance_m) / 1000` for attributable saved trips of the brand. Vehicle `mileage_km` MUST NOT be used for this value.
- **FR-011**: Only saved trip-history rows MUST count. Route previews and favorites MUST NOT count. Saving a route MUST preserve its brand in the vehicle snapshot for future attribution.
- **FR-012**: Route rows MUST group trimmed, case-insensitive origin/destination pairs and include trip count, total distance, distinct users, distinct vehicles, and per-vehicle trip/distance summaries.
- **FR-013**: The dashboard MUST show summary cards, a vehicle type chart, fleet overview/timeline when data is sufficient, most-used routes, and a recent saved-trip section using responsive MUI components.
- **FR-014**: Dashboard and profile MUST reuse the Admin light/dark preference and theme toggle behavior; no second independent preference or extra theme control is allowed.
- **FR-015**: Frontend MUST show accessible loading, zero/empty, error, retry, and zero-value states; charts and controls MUST use active MUI theme values.
- **FR-016**: API request, success, and safe error envelopes MUST follow the existing `data`/`error` contract and be documented in OpenAPI.

### Key Entities

- **Producer Account**: Existing account with role `producer` and `brand` used as the reporting company identity.
- **Vehicle**: Existing owner-managed vehicle with explicit nullable brand for legacy records and an archive timestamp; newly created vehicles require a brand.
- **Trip History**: Existing explicitly saved route with distance, owner, vehicle ID/snapshot, route endpoints, and timestamp.
- **Producer Report**: Read-only aggregate containing brand-level counts, distances, type distribution, fleet timeline, route rankings, per-vehicle route summaries, and recent trips without personal owner data.

## Success Criteria

- **SC-001**: A Producer report exactly matches normalized brand-filtered vehicles and attributable saved trips in test fixtures.
- **SC-002**: Report distance matches the sum of saved route distances within the API's numeric precision and never reads odometer mileage.
- **SC-003**: Anonymous, user, and admin callers receive no Producer report data; a Producer receives only its own brand's aggregate.
- **SC-004**: Producer can navigate only between dashboard and profile in the app, while other roles retain their existing navigation and destinations.
- **SC-005**: Dashboard content and states remain readable in light/dark mode at supported responsive breakpoints.
- **SC-006**: Existing vehicle, trip, and admin flows remain operational after migration and archive behavior changes.

## Assumptions

- The current account session/cookie authentication remains authoritative; no JWT architecture is introduced.
- Existing saved `TripHistory` rows are the source of route/trip truth; route previews and favorites are excluded.
- Existing vehicles remain unbranded until an owner edits them. Historical physical deletions that occurred before this migration cannot be reconstructed.
- The existing chart stack has no charting dependency, so the donut/timeline will use MUI and lightweight CSS/SVG presentation without adding dependencies.
- No PDF support exists on this branch; no Download PDF action is shown.
