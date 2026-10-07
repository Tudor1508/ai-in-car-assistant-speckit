# Research: Trip History

**Feature**: [Trip History](spec.md)  
**Date**: 2026-10-07

## Decision: Extend the trips module and introduce saved history explicitly

**Finding**: `backend/src/trips/routes.py` exposes place search, route preview, and favorites only. `preview_owned_trip` returns a validated `TripPreviewResponse` but does not persist a trip. The only trip-related model is `TripFavorite`, which stores endpoint pairs. `/trips` in the frontend currently redirects to `/trip`.

**Decision**: Add `TripHistory` persistence and POST/GET history operations under the existing `/trips` router. Add an explicit planner save action. A preview and a favorite remain non-history operations.

**Rationale**: This follows the feature's explicit-save clarification and keeps trip ownership, provider output, and favorite behavior in the existing trips module.

**Alternatives considered**: Treat every preview as history (rejected by clarification); repurpose favorites (they do not contain routes or trip instances); create a separate trip microservice (unnecessary architectural expansion).

## Decision: Snapshot the selected route and never recalculate for history

**Finding**: `TripRoutePreview` and `TripRouteOption` carry route GeoJSON `LineString` coordinates in `[longitude, latitude]` order, distance, driving duration, feasibility, vehicle range, legs, stops, and optional scenic attractions/restaurants. `TripPlanningDashboard` derives `displayedPreview` from the selected `route_option_id` and selected preference. None of this is persisted.

**Decision**: Save the selected preview payload, validate its shape/coordinates/metrics, verify the submitted vehicle belongs to the active account, and snapshot its server-owned display fields. Persist map data as JSON and aggregate metrics as numeric columns. Rehydrate a `TripRoutePreview`-compatible object and pass it with saved endpoints to the existing `RouteMap`.

**Rationale**: It preserves exactly the user-selected geometry, including stops and incomplete feasibility, without provider calls, credentials, or a second map implementation.

**Alternatives considered**: Recalculate on history view (rejected because provider data/routing can change); create preview drafts in the database or a server cache and promote them on save (adds lifecycle/storage without an existing cache); replace Leaflet or add a map dependency (not needed).

## Decision: One owner-scoped paginated response includes aggregates

**Finding**: Admin API list operations apply SQL offset/limit, deterministic tie order, and return `stats` and `pagination` alongside rows. There is no existing trip pagination. The trip API wraps successful data in `SuccessEnvelope` and obtains the active `Account` from `require_account`.

**Decision**: GET `/trips/history` returns only one page of at most 10 owner records, `pagination` shaped like the admin response, and an all-history `summary` in the same envelope. Filter page, count, and aggregate queries by `owner_account_id`. Sort by creation time ascending/descending and use ID as tie-break.

**Rationale**: One request keeps the page's initial state coherent and reuses the project's established SQL pagination and response conventions.

**Alternatives considered**: Load all rows into the browser (breaks pagination scope); separate summary endpoint (unneeded extra request and could briefly disagree with page data); aggregate only current page (contradicts the feature spec).

## Decision: Preserve vehicle presentation as an immutable snapshot; omit cost

**Finding**: Vehicles are account-owned and have name, model, type, year, range, mileage, and optional fuel type. Preview currently returns vehicle ID and range calculations but does not include display name/model. Vehicle records can be edited/deleted. Neither a trip nor vehicle has energy/fuel consumption cost fields or price data.

**Decision**: At save time, use owner-scoped vehicle lookup to capture the minimal display snapshot (ID, name, model, type) and the preview's current/available/maximum range. Do not calculate or show trip cost.

**Rationale**: Historical cards continue to identify the vehicle after later edits/deletion and use only supported domain information.

**Alternatives considered**: Read current vehicle label on every history request (would rewrite history after edits/deletion); invent a cost estimate from range/mileage (not a supported or reliable model).

## Decision: Reuse Leaflet map and avoid initial ten-map work

**Finding**: `RouteMap.tsx` is the only trip map. It is dynamically imported with SSR disabled, uses React Leaflet/Leaflet, configured public tile URL and attribution, `Polyline`, endpoint markers, station/attraction/restaurant markers, and `FitRoute` over route coordinate bounds. There is no provider-neutral map interface; only the tile URL/attribution are configurable. The map includes an incomplete-range overlay and current height of 320px mobile/460px desktop.

**Decision**: Reuse this component and route format; add an optional compact height for history. Mount a card's map when near the viewport to avoid initializing all ten Leaflet maps and requesting all tile sets immediately.

**Rationale**: Keeps one rendering path and provider/tile constraints while limiting the cost of the newly required per-trip maps.

**Alternatives considered**: Duplicate map (diverges visually and behaviorally); install a second provider abstraction (none exists and no additional dependency is needed); render ten full-height maps eagerly (needlessly increases initial DOM/tile work).

## Decision: Follow existing authentication, CSRF, and migration conventions

**Finding**: Protected trip reads use `require_account`; state-changing POST operations use both `require_account` and `require_csrf`; owner ID is derived from the account dependency. `SuccessEnvelope`, common error declarations, safe error handling, SQLAlchemy models, and numbered Alembic migrations are standard. Current migration head is `0005_admin_dashboard` after `0004_trip_favorites`.

**Decision**: Require active-session auth on both routes, CSRF on create, derive owner on backend, register the model in `src/data/models/__init__.py`, and add revision `0006_trip_history` after current head.

**Rationale**: Follows current security and evolution conventions; no user or trip data backfill is needed.

**Alternatives considered**: Trust client-provided owner IDs or add a separate auth path (rejected); alter favorite table into a polymorphic entity (unnecessary and risky).

## Decision: Use existing test tools and configured provider scenarios

**Finding**: Backend uses pytest and `TestClient` against temporary SQLite; configured trip integrations access live ORS through real routers. Frontend uses Playwright. Existing trip E2E tests include a combination of real configured ORS scenarios and explicit route fixtures for UI-only cases. Frontend scripts include type check, build, and Playwright; there is no unit-test framework script.

**Decision**: Add backend model/API/migration tests, focused Playwright scenarios, one configured live-provider save/reload path, and type-check/build coverage. No test framework or production dependency is added.

**Rationale**: Tests the cross-layer snapshot contract while matching existing project conventions.

**Alternatives considered**: Add a new frontend unit test runner (unnecessary); mock live-provider integration tests (does not match the existing route integration standard).
