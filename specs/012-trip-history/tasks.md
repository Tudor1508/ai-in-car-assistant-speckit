# Tasks: Trip History

**Input**: Design documents from `specs/012-trip-history/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: Approved `spec.md` and `plan.md`; data model and API/UI contracts are available.

**Tests**: Included because the approved plan explicitly requires backend, migration, frontend, and integration coverage.

**Organization**: Tasks are grouped by the three approved user stories. Shared persistence and history-read foundations begin in P1 User Story 1 because that story first needs persisted history; later stories extend its response and controls.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Work can proceed in parallel because it changes a separate file and has no incomplete dependency.
- **[Story]**: User story served by the task.
- All source and test paths below are repository-relative.

## Phase 1: Setup

**Purpose**: No setup changes are required. The existing FastAPI, SQLAlchemy/Alembic, Next.js, Redux, MUI, Leaflet, pytest, and Playwright infrastructure is already in place; no dependencies or project configuration changes are planned.

## Phase 2: Foundational

**Purpose**: No separate blocking foundation is required. Existing account authentication, CSRF/session handling, API envelopes, trips feature/store, migration framework, map component, and test fixtures can support the story work directly.

---

## Phase 3: User Story 1 - Review my trip history (Priority: P1)

**Goal**: An authenticated user can explicitly save the selected planned route and later review owner-scoped historical trip cards with the originally selected route shown through the existing map.

**Independent Test**: Save a selected complete or incomplete preview as an authenticated user, reload `/trips`, and verify its details and saved geometry/markers appear. Verify another account cannot read it; verify loading, error/retry, and empty states.

### Tests for User Story 1

> Write focused tests first; verify expected failures before implementing their behavior.

- [x] T001 [P] [US1] Add save/read API tests for authentication, CSRF, strict payload validation, owner isolation, exact route snapshot persistence, default page size/order, and response envelopes in `backend/tests/test_trip_history.py`.
- [x] T002 [P] [US1] Add migration upgrade/downgrade, new-table/index/check, and existing-record preservation coverage in `backend/tests/test_schema_evolution.py`.
- [x] T003 [P] [US1] Add Playwright coverage across `frontend/tests/trip-history.spec.ts` and `frontend/tests/trip-planning.spec.ts` for explicit save/no autosave, saved and incomplete route rendering, empty/loading/error/retry states, narrow layout, separate missing/corrupt-route and configured map-tile fallback states, and metadata visibility including origin, destination, date, distance, duration, vehicle, route type, and any supported cost.

### Implementation for User Story 1

- [x] T004 [US1] Create `TripHistory` in `backend/src/data/models/trip_history.py` with `id` as a 32-character lowercase hexadecimal string; required `owner_account_id` FK to `accounts.id` with `ON DELETE CASCADE`; UTC `created_at`; trimmed `origin_label` and `destination_label` of 1–255 characters; WGS84 endpoint coordinates with latitude -90..90, longitude -180..180, six fractional digits; required 32-character hex `vehicle_id` snapshot with no vehicle FK; strict vehicle snapshot JSON; required `route_preference` enum `fastest|shortest|scenic`; non-negative `distance_m` and `duration_s`; required route snapshot JSON; and owner/created/id index plus supported checks.
- [x] T005 [US1] Register `TripHistory` in `backend/src/data/models/__init__.py` and add Alembic revision `0006_trip_history` after `0005_admin_dashboard` in `backend/migrations/versions/0006_trip_history.py`; create only the new table/index/checks, preserve current rows, and implement a downgrade that drops only this table.
- [x] T006 [US1] Add strict save and history-item request/response schemas in `backend/src/trips/schemas.py`; reject unknown fields, malformed route snapshots, non-finite or negative metrics, unsupported preference values, and invalid endpoint coordinates while reusing existing place/route domain shapes.
- [x] T007 [US1] Implement explicit snapshot save and owner-scoped history read in `backend/src/trips/service.py`; derive owner from the authenticated account, verify selected vehicle ownership and snapshot its display/range values, preserve submitted geometry without rerouting, and query at most 10 rows per page with newest-first default and deterministic ID tie-break.
- [x] T008 [US1] Add authenticated `POST /trips/history` and `GET /trips/history` handlers in `backend/src/trips/routes.py`; apply active-session checks to both, CSRF to save, owner-derived service calls, existing success/error envelopes, and page/page_size validation with maximum 10.
- [x] T009 [US1] Add save and paginated-history request types/actions and request states to `frontend/src/features/trips/tripsApi.ts` and `frontend/src/features/trips/tripsSlice.ts`; use the existing API client and reset history state through the existing `authCleared` flow.
- [x] T010 [US1] Add an explicit **Save trip** action to `frontend/src/features/trips/components/TripPlanningDashboard.tsx`; submit only the chosen preview and selected route preference, preserve the preview on recoverable errors, prevent duplicate submissions, and label incomplete saved routes without autosaving or merging the separate favorite action.
- [x] T011 [US1] Extend `frontend/src/features/trips/components/RouteMap.tsx` with optional compact height and accessible map label props while preserving planner defaults, dynamic client-only loading, configured tiles/attribution, markers, geometry order, overlays, and viewport behavior; handle configured tile/provider load failures with a clear, non-blocking fallback inside the map area without switching providers or failing the card/page.
- [x] T012 [US1] Create `frontend/src/features/trips/components/TripHistoryCard.tsx` to render each saved trip’s ID, endpoints, localized save time, distance, duration, vehicle snapshot, preference, and incomplete state; reconstruct its map from the persisted route/feasibility/legs/stops/POIs through the existing `RouteMap`. Keep metadata visible for both a missing/corrupt saved-geometry fallback and a separate map-provider/tile failure fallback; neither case recalculates or switches providers.
- [x] T013 [US1] Create `frontend/src/features/trips/components/TripHistoryPage.tsx` using `docs/reference-ui/trip_history.png` as the primary visual reference for its heading/intro, summary cards, sorting, and trip-card hierarchy; compose existing project components, design tokens, responsive patterns, and architecture rather than reproducing the screenshot blindly. Include stacked trip cards, accessible loading/error/retry/empty states, and lazy map mounting with fixed-size placeholders for visible-page cards.
- [x] T014 [US1] Render `TripHistoryPage` from `frontend/src/app/(account)/trips/page.tsx` instead of redirecting to `/trip`, retaining the existing account layout and authentication behavior.
- [x] T015 [US1] Add the `/trips` Trip History navigation link and active-page state in `frontend/src/components/AppNavigation.tsx` using existing navigation conventions.
**Checkpoint**: Explicit save and owner-scoped history review work independently, with map reconstruction from stored route data and graceful states.

---

## Phase 4: User Story 2 - Understand my overall travel (Priority: P2)

**Goal**: The page summarizes all of the authenticated user’s saved trips, including journeys, distance, and estimated driving duration.

**Independent Test**: Seed more than one page of owned trips and another account’s trips; verify displayed totals include every owned trip across pages, exclude other owners, and show zeros for empty history.

### Tests for User Story 2

- [x] T016 [P] [US2] Add summary aggregation tests for all owned rows across pages, empty zero totals, incomplete trips, and exclusion of other owners in `backend/tests/test_trip_history.py`.
- [x] T017 [P] [US2] Add page assertions for journey count, total distance, and total driving time from the all-history summary response in `frontend/tests/trip-history.spec.ts`.

### Implementation for User Story 2

- [x] T018 [US2] Extend the owner-scoped history query and response schemas in `backend/src/trips/service.py`, `backend/src/trips/routes.py`, and `backend/src/trips/schemas.py` to return `total_trips`, `total_distance_m`, and `total_duration_s` aggregated across all rows for the authenticated owner, independent of the requested page.
- [x] T019 [US2] Map the all-history summary response into the shared types and state in `frontend/src/features/trips/tripsApi.ts` and `frontend/src/features/trips/tripsSlice.ts`.
- [x] T020 [US2] Add responsive summary cards for journeys, total distance, and total estimated driving time to `frontend/src/features/trips/components/TripHistoryPage.tsx`; use existing formatters and omit cost because the domain has no cost model.

**Checkpoint**: Summary totals describe the entire authenticated user’s history, not just the visible page.

---

## Phase 5: User Story 3 - Sort and browse trips (Priority: P2)

**Goal**: The user can select newest-first or oldest-first ordering and browse the history in stable pages of at most 10 while retaining sort selection.

**Independent Test**: With more than 20 trips and timestamp ties, verify page boundaries, newest default, oldest option, deterministic order, next/previous navigation, and sort preservation; changing sort returns to page 1.

### Tests for User Story 3

- [x] T021 [P] [US3] Add API tests for 10-row maximum, page boundaries, total metadata, ascending/descending order, newest default, deterministic equal-time ID order, invalid query values, and out-of-range page behavior in `backend/tests/test_trip_history.py`.
- [x] T022 [P] [US3] Add Playwright coverage for sort selection, page indicator, next/previous navigation, sort preservation while paging, page reset on sort change, and disabled/loading controls in `frontend/tests/trip-history.spec.ts`.

### Implementation for User Story 3

- [x] T023 [US3] Complete history query validation and SQL ordering/pagination in `backend/src/trips/schemas.py`, `backend/src/trips/routes.py`, and `backend/src/trips/service.py`: accept `page >= 1`, `page_size` 1–10, `sort_order` `desc|asc` defaulting to `desc`, order by timestamp plus stable ID tie-break, and return existing-convention pagination metadata (`page`, `page_size`, `total`, `total_pages`).
- [x] T024 [US3] Extend history query/actions in `frontend/src/features/trips/tripsApi.ts` and `frontend/src/features/trips/tripsSlice.ts` so navigation retains sort, changing sort resets to page 1, and request state prevents stale-page data from being presented as the selected page.
- [x] T025 [US3] Add newest/oldest sorting, previous/next controls, current page indication, bounds and in-flight disabling, and stale-page clamping/refetch behavior in `frontend/src/features/trips/components/TripHistoryPage.tsx`.

**Checkpoint**: The backend returns bounded, stable pages and the UI preserves the selected sort during navigation.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Verify integration against the approved route snapshot contract and existing project commands.

- [ ] T026 Verify the configured live ORS save/reload integration scenario in `frontend/tests/trip-history.spec.ts`: save the selected route and an incomplete route, compare persisted/reloaded geometry and metadata with the selected preview, confirm history reads do not call route calculation, and confirm user isolation. This verifies the real configured cross-layer flow beyond the deterministic fixture tests.
- [ ] T027 Run final verification from the existing project environments: `python -m compileall src` and `python -m pytest` in `backend/`; `npm run type-check`, `npm run build`, and `npm run test:e2e` in `frontend/`; resolve failures attributable to this feature. `frontend/package.json` has no lint script, so do not add tooling solely for this feature.

## Dependencies & Execution Order

### Phase Dependencies

- Setup and Foundational have no code tasks: required infrastructure already exists.
- User Story 1 establishes the persisted snapshot, API, page, and map foundation.
- User Story 2 extends the history response and page with owner-scoped aggregate values; it follows User Story 1’s endpoint and state.
- User Story 3 extends the same query, API state, and page controls; it follows User Story 1 and can be implemented after or alongside User Story 2 only where file-level dependencies permit. The listed sequence is safest because the same response and page files are extended by both stories.
- Polish verification depends on all three stories.

### User Story Dependencies

- **US1 (P1)**: Independent after existing project infrastructure; first feature increment.
- **US2 (P2)**: Depends on US1 history persistence/read contract; adds aggregate statistics.
- **US3 (P2)**: Depends on US1 paginated history read; adds sorting controls and completes page navigation. Backend baseline already caps reads at 10 in US1.

### Parallel Opportunities

- US1 test authoring tasks T001–T003 can proceed in parallel because they target separate test files/suites. Backend model/migration and frontend tests can be developed independently, but implementation tasks retain their listed dependencies.
- US2 tests T016 and T017 can proceed in parallel.
- US3 tests T021 and T022 can proceed in parallel.
- Avoid parallel edits to the shared backend schema/service/routes and frontend API/slice/page files across US2 and US3; sequence those edits to prevent conflicts.

## Implementation Strategy

Deliver **US1 as the MVP**: authenticated explicit route saving, owner-scoped history retrieval, first page of at most 10 trips, route restoration through the existing map, and loading/error/empty states. Then deliver US2 summary totals and US3 sorting/page controls as independently verifiable increments. Run the final integration and verification task after all desired stories are complete.

## Independent Test Criteria

- **US1**: Explicitly save a preview; verify only that selected route is persisted and restored for the owning account, while a different account sees no record. Verify empty, loading, error/retry, and incomplete route behavior.
- **US2**: Verify the three summary values against every owned trip across multiple pages, excluding other accounts; empty history produces zero values.
- **US3**: Verify newest/oldest order, stable ties, 10-row maximum, correct page metadata, next/previous behavior, sort preservation, and reset to page 1 after sort changes.

## Format Validation

All executable tasks use unchecked checkboxes, sequential IDs, `[P]` only for independently parallel work, required story labels in story phases, and repository-relative file paths. No speculative setup, dependency, cost-model, or second-map-provider tasks are included.
