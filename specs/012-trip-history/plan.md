# Implementation Plan: Trip History

**Branch**: `012-trip-history` (feature directory and checked-out Git branch) | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-trip-history/spec.md`

## Summary

Add an explicit save action for the selected Trip Plan route, persist an immutable account-owned route snapshot, and expose a paginated owner-scoped history response with all-history totals. Replace the `/trips` redirect with a responsive history page that reuses the existing Leaflet `RouteMap`; retain the existing `/trip` planning flow and map behavior.

The smallest architecture change is one history table and migration, additions to the existing trips schemas/routes/service and Redux/API module, one page component/card composition, and focused backend/Playwright coverage. A selected preview snapshot is validated and saved as supplied so historical routes are not silently recalculated. The backend resolves and snapshots the selected vehicle from the authenticated owner.

## Technical Context

**Language/Version**: Python 3.11–3.13; TypeScript and Node.js 20.9+; React 19.3.0.

**Primary Dependencies**: Existing FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, Next.js 16.3.7, Redux Toolkit 2.13.0, React Redux 9.3.0, MUI 9.4.0, Leaflet 1.9.4, React Leaflet 5.0.0, Playwright 1.56.1. No dependency additions.

**Storage**: Existing SQLite database through SQLAlchemy/Alembic. Add one account-owned `trip_history` table. Persist route geometry and map overlays in SQLite JSON columns; retain queryable timestamps and distance/duration scalars for sorting and aggregation.

**Testing**: Backend pytest with the existing FastAPI `TestClient`, temporary SQLite fixtures, and migration/schema-evolution checks. Frontend Playwright end-to-end tests; API types checked by `npm run type-check`; production compatibility checked with `npm run build`. Existing live ORS scenarios use environment-supplied trip inputs, while focused UI scenarios may use the same explicit Playwright route-fixture pattern already present in `trip-planning.spec.ts`.

**Target Platform**: Existing responsive web application and local SQLite-backed API.

**Project Type**: Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: Each history read returns at most 10 trips and calculates totals over only the authenticated owner's rows. Do not impose a new latency SLA. Keep each historical map compact and use the existing configured tile source and visible attribution; do not add a map provider or prefetch policy.

**Constraints**: Preserve CSRF and active-session checks on trip creation; derive owner and vehicle snapshot on the backend; never return `owner_account_id`; validate route snapshot coordinates and domain enums; preserve UTC timestamps, 32-character hex IDs, success/error envelopes, SQLite foreign-key behavior, stable sort order, and current map attribution. Do not calculate estimated cost: no cost/consumption/pricing model exists. No historical trip data needs backfill because no trip rows exist today.

**Scale/Scope**: One authenticated `/trips` page; one history create and one page-read operation; maximum 10 entries per page; one new history model/table; no history update/delete, export, new provider, or cost model.

## Constitution Check

*GATE: Evaluated before Phase 0 research and after Phase 1 design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | React page owns display, transient selection, and request coordination; the trips API/service validates and persists snapshots, computes owner-scoped summaries, and authorizes access. | PASS |
| II. Compatible, Reusable Frontend | Use declared React/TypeScript/Redux/MUI/Leaflet versions, existing API client, and current route map. No new dependencies. | PASS |
| III. One Authority for Shared Client State | Extend the trips Redux slice for history items, summary, query, and request states. Clear it on existing `authCleared`; keep component-local state only for presentation details. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Document strict save/page response schemas and safe errors. Derive account from `require_account`, require CSRF for save, scope all reads/aggregates by owner, and verify the submitted vehicle belongs to that account. | PASS |
| V. Verified, Accessible User Outcomes | Add backend validation, persistence, ownership, summary, pagination/sort, and migration coverage plus Playwright save/history/map/states/responsive flows. Preserve labels, keyboard operation, loading and safe errors. | PASS |
| SDD Development and Review | Plan, data model, API/UI contracts, quickstart, and later tasks trace to the Trip History specification. Code review must verify route snapshot integrity and ownership. | PASS |

No constitution violations or exceptions are proposed.

## Project Structure

### Documentation (this feature)

```text
specs/012-trip-history/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── trip-history-api.md
│   └── trip-history-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Created by $speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/data/models/
│   ├── trip_history.py               # New immutable saved trip model
│   └── __init__.py                   # Register model for metadata/Alembic
├── src/trips/
│   ├── schemas.py                    # Strict save and history-page contracts
│   ├── routes.py                     # POST save + GET paginated history
│   └── service.py                    # Save snapshot; owner-scoped list/summary
├── migrations/versions/
│   └── 0006_trip_history.py          # New table/index/FKs; no backfill
└── tests/
    ├── test_trip_history.py          # New API, ownership, sorting, page, summary tests
    └── test_schema_evolution.py      # Extend migration/head assertions if needed

frontend/
├── src/app/(account)/trips/page.tsx  # Render history instead of redirecting to /trip
├── src/components/AppNavigation.tsx  # Add Trip history link and active state
├── src/features/trips/
│   ├── tripsApi.ts                   # Save and paginated history requests/types
│   ├── tripsSlice.ts                 # Shared history query/data/status
│   └── components/
│       ├── TripPlanningDashboard.tsx # Explicit save selected preview action
│       ├── RouteMap.tsx              # Accept compact height/map label for history
│       ├── TripHistoryPage.tsx       # Header, stats, sorting, pagination/states
│       └── TripHistoryCard.tsx       # Snapshot details and existing route map
├── src/lib/store.ts                  # No structural change when tripsSlice is extended
└── tests/
    └── trip-history.spec.ts          # New save/list/map/pagination/state coverage
```

**Structure Decision**: Continue the existing `features/trips` module, `/trips` account route, `/trips/*` API router, Redux store, and SQLAlchemy model/migration patterns. Extend the current trip slice and `RouteMap` rather than creating a separate feature stack or map. Keep API, UI, model, and migration changes scoped to trip history.

## Implementation Design

### Backend and persistence

- Add `TripHistory` as an immutable saved snapshot. Store owner ID, UTC `created_at`, endpoint labels and WGS84 coordinates, selected `route_preference`, `distance_m`, `duration_s`, optional current vehicle ID, a compact vehicle display snapshot, and JSON map data (route geometry, feasibility/range summary, legs, stops, and scenic attractions/restaurants when selected).
- Keep distance and duration as scalar columns for all-history SQL sums. Keep geometry and overlays in JSON because they are not filtered or sorted and must be restored without a provider call. Do not duplicate geometry or metrics in multiple canonical fields.
- Use a foreign key from owner to account with `ON DELETE CASCADE`; retain the vehicle ID as a snapshot value without a cascading vehicle relationship so deleting a vehicle cannot erase or rewrite history. Store its display snapshot at save time.
- Add migration `0006_trip_history` after `0005_admin_dashboard`, with the same 32-character lowercase hex ID check, WGS84 endpoint checks/precision, owner/creation/ID index, and any route metric/status checks supported by existing naming conventions. Since there is no trip table, migration creates an empty table and preserves all existing account, favorite, and vehicle rows.
- `POST /trips/history` takes the explicit selected route snapshot and vehicle ID. Use strict Pydantic schemas based on existing `PlaceSelection`, `RouteMetrics`, `RouteFeasibility`, `RouteLeg`, and `RouteStop`. Reject unknown fields and invalid coordinates, non-finite/negative metrics, invalid route preferences, or malformed snapshots. Look up the vehicle by `(id, owner_account_id)` and build the immutable vehicle display snapshot server-side. Do not call ORS again: the saved geometry must be the one the user selected. The route preview and save response share the existing authenticated owner boundary; only that owner can access the resulting record.
- `GET /trips/history` accepts `page` (default 1, minimum 1), `page_size` (default 10, 1–10), and `sort_order` (`desc` default, `asc` oldest-first). Filter before both list and aggregate queries by `account.id`. Order by `created_at` in requested direction and `id ASC` as stable tie-break. Apply offset/limit in SQL. Return trip rows, `pagination` in the existing admin shape (`page`, `page_size`, `total`, `total_pages`), and `summary` (`total_trips`, `total_distance_m`, `total_duration_s`) in one response. Summary covers every owned trip, not only the requested page.
- A stale page that is now beyond `total_pages` may return an empty item page with current metadata; the frontend clamps to the last valid page (or page 1 for an empty collection) and refetches. Keep the existing `SuccessEnvelope`, common safe error envelope, `require_account`, `require_csrf`, and `get_db` transaction pattern. Return `401` for expired/missing session, `403` for failed CSRF on save, `404 vehicle_not_found` for an unavailable/non-owned vehicle, and `422 validation_error` for malformed payload/query.

### Frontend

- Use `docs/reference-ui/trip_history.png` as the primary visual reference for the Trip History page. Follow its hierarchy and visual treatment while composing existing components, design tokens, responsive patterns, and architecture; do not reproduce the screenshot at the expense of project conventions.
- Add a Trip history navigation link to `/trips`; change the existing `/trips` redirect page to render the page. Leave `/trip` as the planner.
- Add an explicit **Save trip** action near the selected route choice/summary in `TripPlanningDashboard`. Submit only the selected option's route, feasibility, legs, stops, selected scenic POIs, endpoints, vehicle ID, current level, and selected preference; omit unselected options/choices and preview aggregates. Disable duplicate submission while pending, show accessible success/error feedback, and preserve the preview after a recoverable failure. Saving a favorite remains a separate action. Incomplete route previews may be saved, but retain a clear incomplete label.
- Add history request functions/types in `tripsApi.ts`. Extend `tripsSlice` with the page's records, all-history summary, page/page-size/sort query, and loading/succeeded/failed states/actions. Use Redux as the shared source for the summary, list, controls, and save status; rely on the current `authCleared` reset. Map 401 to the established clear-session and `/login` redirect flow.
- Build `TripHistoryPage` from MUI primitives and current dark palette. Match the reference's overline/heading/introduction, three summary cards (journeys, distance, driving duration), newest/oldest selector, and stacked rounded detail cards. Do not show cost because no authoritative cost value exists. Include journey identifier, origin → destination, localized planning date/time, distance, duration, vehicle snapshot, route type, and incomplete status where applicable.
- Each visible trip card includes a compact instance of the existing dynamically imported `RouteMap`. It receives the saved route preview shape plus saved origin/destination; preserve `[longitude, latitude]` wire order, start/end markers, route polyline, stop/POI markers, incomplete-range overlay, route bounds, configured tiles, and attribution. Extend `RouteMap` with optional responsive height and map label while keeping current planner defaults. Give each map a unique accessible label. A corrupt/missing geometry retains card details and shows a map-unavailable message instead of rerouting. If configured tile/provider requests fail, keep origin, destination, date, distance, duration, vehicle, route type, and any cost value supported by the domain visible and usable (the current domain has no cost value to display); show a clear, non-blocking fallback inside the map area; do not fail the card/page or switch providers. Reuse existing error presentation conventions where possible. Keep this separate from the missing/corrupt saved-geometry fallback.
- Render maps for all trips on the current page in compact containers; use an `IntersectionObserver` gate with a fixed-size placeholder so a map mounts when its card approaches view, limiting initial tile/DOM work without hiding the map from that trip. Use the existing client-only dynamic import (SSR off); add no map package or second provider integration.
- Default to page 1, ten entries, newest-first. Sorting resets page to 1; page navigation changes only the page and retains sort. Disable previous/next during requests and at bounds. Announce loading/errors with `role=status`/`role=alert`, offer retry, show an empty state for zero trips, and hide or disable unusable pagination for zero/one page. Reuse the account shell and established responsive nav/card spacing; allow metric and pagination rows to wrap/stack on small screens.

### Reuse and non-goals

- Reuse: `AppNavigation`, authenticated account layout and session APIs, `apiRequest`, trips API/router/schemas/service/slice, `RouteMap`, `RouteSummary` display conventions, `tripsSlice` domain types, `PlaceSelection`/route types, `authCleared`, MUI and existing format conventions, account owner lookup, migration base, `SuccessEnvelope`, error handlers, pytest temporary SQLite fixtures, and Playwright live/configured-route helpers.
- No new trip route-calculation service, map provider, authentication scheme, database library, frontend state library, cost calculation, history edit/delete/export, unrelated navigation refactor, or conversion of favorite routes into trip history.

## Test Strategy

- **Backend schema/model**: validate required snapshot data, supported preference and feasibility enums, WGS84/finite coordinates, metric constraints, vehicle display snapshot, UTC creation time, ID and FK behavior.
- **Backend endpoint/security**: unauthenticated GET/POST returns safe 401; POST requires CSRF; foreign/unknown vehicle cannot be saved; response omits owner ID; account A cannot list or aggregate account B's records; use active session account as sole owner source.
- **Backend pagination/sorting**: create more than 10 saved rows through service/API using a valid configured or request-built route snapshot; assert SQL limit, 10 maximum, page boundaries, total/total_pages, newest and oldest order, deterministic equal-time ties, sort retained by query, out-of-range behavior, and page size validation.
- **Backend summary**: compare total trips, distance, and duration to all owner rows across pages; include incomplete saved routes; show zeros for empty history; prove another owner's data is excluded.
- **Migration/persistence**: test upgrade from current head `0005_admin_dashboard`, empty history table and FK/index/checks, persistence after a new session, and downgrade drops only the new table. Existing account/vehicle/favorite data remains.
- **Trip Plan integration**: with the existing live configured ORS scenario, choose one route option and save its exact selected geometry; reload history and compare serialized geometry, metrics, feasibility, preference, stops, and vehicle snapshot to the selected preview. Include a selected incomplete route. No ORS re-request occurs during history load.
- **Frontend Playwright**: page navigation and active nav state; explicit save/no autosave; save loading/success/failure; page renders summary and every returned detail; map line/endpoints/stops and saved bounds are reconstructed with the existing Leaflet component; sort reset and preservation through previous/next; loading, empty, page error/retry, saved-map-data failure, configured tile/provider request failure with metadata still visible and an in-map non-blocking fallback, expired session; keyboard labels and narrow viewport. Simulate tile failure in the existing UI fixture pattern; do not switch providers.
- Use configured live ORS tests for end-to-end save/reload; use isolated, explicit UI route fixtures only for deterministic component/error states following the existing trip-planning suite. Do not add dependencies. Required commands remain `python -m pytest`, `npm run type-check`, `npm run build`, and `npm run test:e2e` under existing environment setup.

## Implementation Order

1. Add the `TripHistory` model, register it with SQLAlchemy metadata, and write migration `0006_trip_history`; verify it leaves accounts, vehicles, and favorites unchanged.
2. Define strict request/response schemas for selected-route saving and paginated history. Implement owner-scoped save/list/aggregate services and authenticated routes; document safe validation and ownership errors.
3. Add backend model, API, authorization, pagination/sorting, all-history aggregate, persistence, and migration tests.
4. Extend `tripsApi.ts` and `tripsSlice.ts` for save and history state. Add explicit save to the existing planner and exercise complete and incomplete selected preview snapshots.
5. Update `RouteMap.tsx` with optional map label/compact height and a non-blocking tile/provider-failure fallback in the map region. Build the trip history card and page to restore each route snapshot through that same map, then add loading, empty, error/retry, sort, and page controls.
6. Replace the `/trips` redirect with the history page and add the navigation link; verify existing `/trip`, vehicles, profile, and sign-out paths remain unchanged.
7. Add Playwright coverage for navigation/save/reload, map rendering, graceful configured tile/provider failure, totals, page navigation/sorting, states, session expiration, keyboard use, and responsive layout; run the configured live ORS end-to-end save/reload flow.
8. Run the existing backend, type-check, build, and Playwright commands; review the implementation against this plan/spec, API contracts, ownership boundaries, map snapshot fidelity, and accessibility requirements.

## Constitution Check (Post-Design)

| Principle | Design evidence | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Frontend owns page, selected-route submission and rendering. Backend owns validation, persistence, summaries, ordering, pagination, and owner authorization. | PASS |
| II. Compatible, Reusable Frontend | Existing MUI, Redux, Next, React Leaflet, API client, responsive conventions, and current dependency pins are reused. | PASS |
| III. One Authority for Shared Client State | One trip Redux slice owns history query, response, status, and save status; transient dialogs/observers remain local. `authCleared` clears account data. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | New strict Pydantic contracts, active account dependency, CSRF-protected create, account-scoped vehicle validation, SQL owner filters, minimal responses, safe error codes. | PASS |
| V. Verified, Accessible User Outcomes | Test strategy covers API authorization/contracts, persistence and migration, integration, map reconstruction, every required state, responsive and keyboard use. | PASS |
| SDD development and review | Data model, API/UI contracts, quickstart and subsequent tasks are traced to FR-001–FR-014 and SC-001–SC-007. | PASS |

No constitution exception is proposed.

## Complexity Tracking

No constitution violations or additional dependencies/services are proposed. A JSON route-map snapshot is required to preserve the selected historical route; scalar distance and duration remain separate only because complete-history aggregation and ordering need queryable values.
