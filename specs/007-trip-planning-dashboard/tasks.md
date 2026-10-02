**Independent Test**: With a rotated ORS credential and place/range values configured in the ignored `.env`, use the real signed-in frontend, backend routes, and ORS service to plan a route. Verify route/leg consistency, map metrics, and live station results without fixed station names or coordinates. Repeat without a vehicle and signed out.
---

description: "Task list for the trip planning dashboard feature"
---

# Tasks: Trip Planning Dashboard

**Input**: Design documents from `/specs/007-trip-planning-dashboard/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the project constitution requires frontend/backend coverage for protected operations and cross-layer behavior. Author the story-specific tests before implementation and verify they fail for the missing behavior.

**Organization**: Tasks are grouped by user story. US1 delivers route planning and range-aware station stops; US2 delivers saved favorite routes.

## Phase 1: Setup

**Purpose**: Add only the dependencies and environment examples required by the approved plan.

- [X] T001 [P] Add exact, React 19-compatible `leaflet==1.9.4`, `react-leaflet==5.0.0`, and a compatible pinned `@types/leaflet` dependency to `frontend/package.json` and update `frontend/package-lock.json` with npm.
- [X] T002 [P] Promote `httpx==0.28.1` into `backend/requirements.txt`, remove its duplicate test-only pin from `backend/requirements-dev.txt`, update `backend/.env.example` and create `frontend/.env.example` with replace-me placeholders for every configuration value, and update `.gitignore` to allow the frontend example; remove source-coded API URL/origin fallbacks in `frontend/src/lib/api/client.ts` and `backend/src/auth/config.py`, and parameterize origins/ports in `frontend/playwright.config.ts` and `backend/scripts/e2e-server.ps1`; do not add credentials, fixed test places, coordinates, or route data.

---

## Phase 2: Foundational

**Purpose**: Create configuration and integration entry points required by both user stories. No user-story endpoint or UI may bypass these boundaries.

- [X] T003 [P] Add typed environment-backed settings in `backend/src/trips/settings.py` for the documented ORS provider values and exact `TRIP_TEST_*` inputs from `specs/007-trip-planning-dashboard/quickstart.md`; load the ignored local `.env` for backend tests/commands, require values instead of source defaults, validate configuration, and fail clearly when live integration settings are absent.
- [X] T004 [P] Create the trips router package in `backend/src/trips/__init__.py` and `backend/src/trips/routes.py`, then mount its router in `backend/src/main.py` without changing the existing `/health` response or authentication/vehicle routes.
- [X] T005 [P] Create the initial trip state and `authCleared` cleanup in `frontend/src/features/trips/tripsSlice.ts`, register the reducer in `frontend/src/lib/store.ts`, and ensure route/favorite state is cleared when the signed-in account is cleared.

**Checkpoint**: Environment/configuration, API mounting, and shared client state exist; ORS secrets are not in browser configuration or source.

---

## Phase 3: User Story 1 - Plan and preview a trip (Priority: P1) - MVP

**Goal**: Let an authenticated user select a vehicle, resolve origin/destination, enter current fuel/battery level, preview the road route and metrics, and receive feasible station stops based on current and maximum range.


### Tests for User Story 1

- [X] T006 [US1] Add live place-search integration tests through the real FastAPI router and configured ORS service for authentication, query validation, returned/empty suggestions, and real provider errors in `backend/tests/test_trip_places.py`; source queries from environment, not fixed locations or response fixtures.
- [X] T007 [US1] Add live preview integration tests through the real FastAPI router, database, and configured ORS service for owner-scoped vehicles, current-range first leg, maximum-range later legs, detours, stop limit, configured no-feasible-station routes, CSRF, and real provider failures in `backend/tests/test_trip_preview.py`; do not use fake providers or hardcoded coordinates/ranges.
- [X] T008 [US1] Add Playwright scenarios through the actual frontend, mounted backend endpoints, live ORS provider, and configured OSM tiles for place selection, current-location permission, vehicle states, route details, live station results, incomplete plans, loading/errors/retry, keyboard use, and narrow layout in `frontend/tests/trip-planning.spec.ts`; do not intercept app endpoints or mock provider/map responses.
- [X] T009 [P] [US1] Update the successful-login destination assertion to `/trip` and retain profile/sign-out regression coverage in `frontend/tests/auth-session.spec.ts`.

### Implementation for User Story 1

- [X] T010 [US1] Define validated place, preview request, leg, station, feasibility, and response schemas in `backend/src/trips/schemas.py`; enforce finite WGS84 coordinates, non-empty trimmed labels, existing 32-character vehicle IDs, integer `current_level_percent` from 0 through 100, reject unknown/server-owned fields, and do not accept range/type from the client.
- [X] T011 [US1] Implement the configured live ORS provider adapter in `backend/src/trips/provider.py` using `httpx` for Pelias suggestions, driving directions, and POI search around route geometry; normalize real provider coordinates, metrics, and station data, and never expose the API key or add fake-provider fallbacks.
- [X] T012 [US1] Map provider timeout, quota/rate limit, malformed response, and outage exceptions to safe application errors in `backend/src/api/errors.py` without returning upstream messages, headers, or credentials.
- [X] T013 [US1] Implement the range-aware station planner in `backend/src/trips/service.py`: use `vehicle.range_km * current_level_percent / 100` for the first leg, saved `vehicle.range_km` after each full recharge/refuel, include routed detours, recheck candidates on updated route geometry, cap stops using `TRIP_MAX_STOPS`, and return `incomplete` when no feasible station chain reaches the destination.
- [X] T014 [US1] Implement authenticated `GET /trips/places` and CSRF-protected `POST /trips/preview` in `backend/src/trips/routes.py`; enforce configured query limits, fetch the vehicle by both ID and signed-in owner, translate provider/no-route outcomes to the contract, and preserve the existing shared response envelope.
- [X] T015 [P] [US1] Add typed place-search and preview calls plus safe user-facing error mapping through the existing `apiRequest` wrapper in `frontend/src/features/trips/tripsApi.ts`.
- [X] T016 [P] [US1] Build reusable origin/destination autocomplete and explicit current-location action in `frontend/src/features/trips/components/PlaceAutocomplete.tsx`; use configured debounce/minimum query values, require selecting a suggestion, and preserve editable inputs when browser geolocation is denied.
- [X] T017 [P] [US1] Build the owned-vehicle selector and current fuel/battery percentage control in `frontend/src/features/trips/components/VehicleRangeControl.tsx`; use the existing vehicle state/API, constrain percentage to 0-100, and show estimated current range from the saved vehicle maximum.
- [X] T018 [P] [US1] Build a client-only Leaflet map in `frontend/src/features/trips/components/RouteMap.tsx` and load its CSS from `frontend/src/app/layout.tsx`; show route geometry, origin/destination, ordered stations, configurable tile URL, persistent OSM attribution, and no off-viewport tile prefetch.
- [X] T019 [P] [US1] Build route metrics, per-leg distance, station details, driving-time caveat, and complete/incomplete feasibility states in `frontend/src/features/trips/components/RouteSummary.tsx` using accessible MUI components.
- [X] T020 [US1] Compose the planner in `frontend/src/features/trips/components/TripPlanningDashboard.tsx` and render it at `/trip` from `frontend/src/app/(account)/trip/page.tsx`; load the authenticated user's vehicles, handle no-vehicle and expired-session states, and coordinate preview loading/results through Redux.
- [X] T021 [P] [US1] Add **Plan a trip** as the navigation destination and active-page state in `frontend/src/components/AppNavigation.tsx`; navigate to `/trip` after login in `frontend/src/features/auth/components/LoginForm.tsx` while retaining `/profile` and `/vehicles` destinations.
- [ ] T022 [US1] Run the live ORS integration tests T006-T008 sequentially using configured environment inputs, then run the independent login regression in `frontend/tests/auth-session.spec.ts`; resolve failures without substituting provider mocks.

**Checkpoint**: A user with an owned vehicle can independently plan a trip and see complete or explicitly incomplete range feasibility; favorite persistence is not required for this story.

---

## Phase 4: User Story 2 - Save and reuse favorite routes (Priority: P2)

**Goal**: Persist an account-owned origin/destination pair and show it below the location fields for later reuse without automatically previewing it.

**Independent Test**: Save selected endpoints, reload `/`, confirm the favorite remains visible, select it and verify only the location fields are populated. Confirm another account cannot read it and duplicate saves do not create duplicate rows.

### Tests for User Story 2

- [X] T023 [P] [US2] Add favorite integration tests against the real FastAPI router and database for create/list envelopes, CSRF, owner isolation, empty list, normalized duplicate idempotency, persistence across requests, and foreign-account denial in `backend/tests/test_trip_favorites.py`; obtain endpoints from live place search using environment-supplied queries, not fixed coordinates or fixtures.
- [X] T024 [P] [US2] Add browser scenarios through the actual frontend and backend for favorite saving, reload persistence, selecting without auto-preview, duplicate-save feedback, session loss, and account isolation in `frontend/tests/trip-favorites.spec.ts`; use live place suggestions and do not intercept API/provider requests.

### Implementation for User Story 2

- [X] T025 [US2] Add `TripFavorite` model, metadata registration, and migration `backend/migrations/versions/0004_trip_favorites.py` with these exact data-model constraints: ID is “Server-generated 32-character lowercase hexadecimal”; owner is “derived from the authenticated session and never accepted from the client”; labels are “Trimmed, non-empty” and “bounded to 255 characters”; latitude is “between -90 and 90 degrees, normalized to six decimal places”; longitude is “between -180 and 180 degrees, normalized to six decimal places”; normalized endpoint pairs are unique per owner; and the owner has a listing index.
- [X] T026 [US2] Add favorite create/list request and response schemas plus owner-scoped, idempotent persistence operations in `backend/src/trips/schemas.py` and `backend/src/trips/service.py`; persist labels/coordinates only, order newest first then ID, and derive owner from the active account.
- [X] T027 [US2] Implement authenticated `GET /trips/favorites` and CSRF-protected `POST /trips/favorites` in `backend/src/trips/routes.py` with the shared success/error envelopes and no cross-account identifiers or data exposure.
- [X] T028 [P] [US2] Add typed favorite list/create calls and Redux loading/success/error/update behavior in `frontend/src/features/trips/tripsApi.ts` and `frontend/src/features/trips/tripsSlice.ts`; clear favorites on `authCleared`.
- [X] T029 [US2] Build `frontend/src/features/trips/components/FavoriteRoutes.tsx` and integrate it below the origin/destination controls in `frontend/src/features/trips/components/TripPlanningDashboard.tsx`; saving requires two selected places, selecting fills fields only, and repeat saves show the existing favorite.
- [ ] T030 [US2] Run and resolve favorite persistence/authorization tests in `backend/tests/test_trip_favorites.py` and `frontend/tests/trip-favorites.spec.ts`.

**Checkpoint**: Favorites survive reloads, remain account-private, and can repopulate the planner without auto-preview.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify security, service-policy compliance, documentation, accessibility, and regression gates across both stories.

- [X] T031 [P] Audit `backend/src/trips/`, `frontend/src/features/trips/`, `backend/.env.example`, `frontend/.env.example`, and `.gitignore` for hardcoded credentials/configuration, browser exposure of ORS secrets, unsafe upstream errors, missing OSM attribution, or forbidden tile prefetch behavior; correct any findings.
- [X] T032 [P] Update `backend/README.md`, `frontend/README.md`, and root `README.md` with `.env` setup, map/provider configuration, environment-driven start instructions, required map dependencies, and live feature 007 validation commands; keep examples placeholder-only with no credentials, fixed test locations, or route data.
- [ ] T033 Run `python -m compileall src` and `python -m pytest` from `backend/`, then `npm run type-check`, `npm run build`, and `npm run test:e2e` from `frontend/`; resolve feature-related failures without changing unrelated behavior.
- [ ] T034 Execute the live frontend-to-backend-to-ORS scenarios in `specs/007-trip-planning-dashboard/quickstart.md` using environment-supplied test locations/ranges, including no vehicle, range-feasible route, configured stop scenarios, provider errors, favorite persistence/privacy, keyboard/mobile use, and regression flows; record any deviation without adding mocked or fixed route data.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001 and T002 edit separate dependency/configuration files and can run in parallel.
- **Foundational (Phase 2)**: Depends on Setup; blocks all stories. T003 (backend settings), T004 (router mount), and T005 (frontend state) touch separate files and can proceed in parallel.
- **US1 (Phase 3)**: Depends on Foundation. US1 tests T006-T009 precede implementation; run live ORS tests T006-T008 sequentially to respect provider quotas, while T009 may run independently. Schemas/provider/range algorithm precede preview routes; UI controls/map/summary precede dashboard integration.
- **US2 (Phase 4)**: Depends on the shared place controls and dashboard from US1 for the final favorite UI. Favorite API tests can be authored independently; persistence/model precedes favorite service/routes; Redux/API precedes UI integration.
- **Polish (Phase 5)**: Depends on both stories.

### User Story Dependencies

- **US1 (P1)**: MVP; starts after Phase 2 and can be validated without persisted favorites.
- **US2 (P2)**: User-facing integration follows US1 because it reuses the origin/destination controls. Its backend persistence/API work can be assigned separately after Foundation if the team keeps its files isolated.

### Parallel Opportunities

- Setup: T001 and T002.
- Foundation: T003, T004, and T005.
- US1 tests: T006-T008 use live external services and must run sequentially; T009 uses a separate file and may run independently. During UI implementation, T016, T017, T018, and T019 are separable components once API/state contracts are stable; T021 edits navigation/auth files separately from dashboard composition.
- US2 tests: T023 and T024. T028 can proceed alongside backend model/service/route tasks because it edits frontend files; T029 follows its API/state and US1 dashboard dependencies.
- Polish: T031 and T032 are independent reviews/documentation tasks before the final test gates T033-T034.

## Parallel Example: User Story 1

```text
Run one live ORS integration scenario at a time to respect provider limits:
Task: T006 - Search live places in backend/tests/test_trip_places.py
Task: T007 - Preview a live range-aware route in backend/tests/test_trip_preview.py
Task: T008 - Exercise the actual frontend/backend/provider flow in frontend/tests/trip-planning.spec.ts

The auth regression test and independent UI component work can proceed separately:
Task: T009 - Update login-destination regression test in frontend/tests/auth-session.spec.ts
Task: T016 - Build autocomplete/current-location control in frontend/src/features/trips/components/PlaceAutocomplete.tsx
Task: T017 - Build vehicle/range control in frontend/src/features/trips/components/VehicleRangeControl.tsx
Task: T018 - Build map in frontend/src/features/trips/components/RouteMap.tsx
Task: T019 - Build route summary in frontend/src/features/trips/components/RouteSummary.tsx
```

## Implementation Strategy

### MVP First (US1)

1. Complete Setup and Foundational phases.
2. Write and fail the US1 API/browser tests.
3. Implement provider adapter, range-aware station planning, and authenticated place/preview contracts.
4. Build the planner controls, map, summary, and post-login root route.
5. Validate the US1 independent test and checkpoint before adding favorites.

### Incremental Delivery

1. Setup + Foundation establish secure configuration, router/state entry points, and map dependencies.
2. US1 delivers a usable route preview with range-aware stop feasibility as the MVP.
3. US2 adds persisted, private favorites without changing route-preview behavior.
4. Polish verifies full suite, responsive/accessibility behavior, configuration security, and contributor setup docs.

## Notes

- Every task uses `- [ ] T###`, adds `[P]` only when files/dependencies permit parallel work, and includes `[US1]` or `[US2]` only in story phases.
- Task IDs are sequential in execution order. Story test tasks precede their implementation tasks.
- The real ORS key is not part of these artifacts; rotate it and enter it only in the ignored local `backend/.env`.

## Phase 6: Convergence

- [X] T035 Add debounced place suggestions with explicit selectable results for origin and destination, require the user to select a suggestion before previewing, and preserve editable input on unresolved queries per FR-002 and US1/AC1 (partial).
- [X] T036 Keep unreachable route segments out of the planned route geometry and distinguish partial leg details from a complete itinerary when no feasible station chain reaches the destination per FR-008 and SC-004 (partial).

## Phase 7: Convergence

- [X] T037 Add an explicit **Use current location** origin action that requests browser geolocation only after user action, resolves the coordinates into the planner's origin, and preserves editable fields with recoverable permission/unavailable feedback per FR-002 and US1/AC1 (missing).
- [X] T038 Render the authenticated trip dashboard at `/trip` and align successful-login navigation, shared navigation, active-page state, and route tests with `/trip`.