# Tasks: Vehicle Management

**Input**: Design documents from `/specs/006-vehicle-management/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/vehicles-api.md](contracts/vehicles-api.md), [contracts/vehicles-ui.md](contracts/vehicles-ui.md), [quickstart.md](quickstart.md)

**Tests**: Included because the project constitution requires appropriate frontend/backend and cross-layer test coverage for protected API and data changes. Story tests are written before their implementation tasks. Do not run them as part of task generation.

**Organization**: Tasks are grouped by user story. Complete the blocking foundation first; then each story has a distinct implementation and verification checkpoint.

## Phase 1: Setup

**Purpose**: Add only the feature module entry points and preserve the approved dependency set.

- [X] T001 Create `backend/src/vehicles/__init__.py` and `frontend/src/features/vehicles/` module structure; keep existing dependency pins in `backend/requirements*.txt`, `frontend/package.json`, and `frontend/package-lock.json` unchanged because the plan adds no dependencies.

---

## Phase 2: Foundational

**Purpose**: Create the persistence entity, shared API mounting, and client state registration required by vehicle-list and mutation stories. No story operation can be completed until this phase is done.

- [X] T002 [P] Define the Vehicle SQLAlchemy model in `backend/src/data/models/vehicle.py` with `id` (server-generated opaque 32-character string), `owner_account_id` (required FK to `accounts.id`), and UTC `created_at`/`updated_at`; enforce type/fuel check constraints and indexes as specified in `data-model.md`.
- [X] T003 Register Vehicle in `backend/src/data/models/__init__.py` and create `backend/migrations/versions/0003_vehicles.py` after `0002_auth_accounts_sessions`; enforce database constraints for allowed type/fuel values and nonnegative distances, while request validation enforces these field constraints verbatim: “name/model: trimmed, 1–80 characters”; “type: exactly `combustion` or `electric`”; “year: from 1886 through the current UTC calendar year”; “range/mileage: nonnegative whole kilometers”; and “combustion fuel is required from `petrol`, `diesel`, `lpg`, `cng`, or `other`; electric fuel is null”.
- [X] T004 [P] Create shared Pydantic request/response schemas in `backend/src/vehicles/schemas.py`, rejecting unknown fields and server-managed fields and matching `contracts/vehicles-api.md`.
- [X] T005 Create the authenticated vehicle router entry point in `backend/src/vehicles/routes.py` and mount it from `backend/src/main.py`; use existing `require_account`, `require_csrf`, and database session dependencies without changing `/health`.
- [X] T006 Register a `vehicles` reducer in `frontend/src/lib/store.ts` and create the typed collection state and actions in `frontend/src/features/vehicles/vehiclesSlice.ts`; shared vehicle data is owned by Redux.
- [X] T007 Add a typed feature API module in `frontend/src/features/vehicles/vehiclesApi.ts` using the existing `apiRequest` wrapper for `{data}` envelopes, cookies, and CSRF handling.
- [X] T008 Extend `backend/src/api/errors.py` with a safe `vehicle_not_found` mapping returning the common error envelope without exposing whether a vehicle belongs to another account.

**Checkpoint**: The migration/model, authenticated router, request/response schemas, shared API conventions, and vehicle Redux/API module exist; no vehicle operation is exposed before its story implementation.

---

## Phase 3: User Story 1 - View my vehicles (Priority: P1) — MVP

**Goal**: Let an authenticated user see their own garage and the supported vehicle details, including a useful empty state.

**Independent Test**: Sign in with an account that has seeded vehicles and verify only its own vehicles and all supported fields appear. Repeat with an empty account and verify a clear empty state and Add vehicle action; verify signed-out access is redirected/denied.

### Tests for User Story 1

- [X] T009 [P] [US1] Add list contract and authentication tests in `backend/tests/test_vehicle_list.py` for `{data:{vehicles:[...]}}`, stable ordering, empty list, and 401 without an active session.
- [X] T010 [P] [US1] Add owner-isolation tests for list and detail reads in `backend/tests/test_vehicle_read_authorization.py`; assert account A cannot receive account B's rows and foreign/unknown item IDs both return safe `vehicle_not_found` 404.
- [X] T011 [P] [US1] Add browser scenarios in `frontend/tests/vehicles-list.spec.ts` for populated and empty garage, accessible Add vehicle affordance, field display, loading/error states, and unauthenticated redirect.

### Implementation for User Story 1

- [X] T012 [US1] Implement `GET /vehicles` and `GET /vehicles/{vehicle_id}` in `backend/src/vehicles/routes.py` and owner-scoped query/service behavior in `backend/src/vehicles/service.py`; derive owner only from the active account and order lists by `created_at`, then `id`.
- [X] T013 [US1] Implement vehicle fetch/error handling in `frontend/src/features/vehicles/vehiclesApi.ts` and populate `frontend/src/features/vehicles/vehiclesSlice.ts` from the list response without creating a competing component-level collection.
- [X] T014 [US1] Build the responsive garage page in `frontend/src/features/vehicles/components/VehicleManagementPage.tsx` and route it from `frontend/src/app/(account)/vehicles/page.tsx`; display name, model, type, year, `range_km`, `mileage_km`, fuel type or “Not applicable”, vehicle count, loading, empty, and recoverable error states.
- [X] T015 [US1] Add safe list retry and authenticated session redirect handling in `frontend/src/features/vehicles/components/VehicleManagementPage.tsx`; retain the last known Redux list after a failed refresh and clear owner-specific state on session loss.

**Checkpoint**: US1 passes its independent test: authenticated list and details, empty state, error recovery, and owner isolation all work without requiring add/edit/delete completion.

---

## Phase 4: User Story 2 - Add and edit my vehicles (Priority: P1)

**Goal**: Let an authenticated user create a valid combustion or electric vehicle and update their own vehicle details.

**Independent Test**: Create one combustion and one electric vehicle, edit valid fields, reload the page, and verify persisted data and type-appropriate fuel display. Submit invalid values and verify nothing invalid is saved.

### Tests for User Story 2

- [X] T016 [P] [US2] Add create/update API contract and validation tests in `backend/tests/test_vehicle_mutations.py` for 201 create, 200 patch, unknown/immutable fields, empty patches, merged type/fuel validation, nonnegative whole kilometers, current-year boundary, 1–80 character trimmed names/models, and safe error envelopes.
- [X] T017 [P] [US2] Add persistence tests in `backend/tests/test_vehicle_persistence.py` for migration-created vehicle rows, transaction rollback, stable owner relationship, and data persisted across API requests using isolated SQLite.
- [X] T018 [P] [US2] Add browser CRUD form scenarios in `frontend/tests/vehicles-create-edit.spec.ts` for combustion/electric create, edit, validation feedback, persisted state after reload, and duplicate-submit prevention.

### Implementation for User Story 2

- [X] T019 [US2] Implement create and partial-update request validation in `backend/src/vehicles/schemas.py`; apply exact `data-model.md` bounds and validate the fully merged record so combustion always has an allowed fuel and electric always has null fuel.
- [X] T020 [US2] Implement owner-scoped create and patch operations in `backend/src/vehicles/service.py` and `backend/src/vehicles/routes.py`; derive `owner_account_id` from the session, return 201/200 envelopes from `contracts/vehicles-api.md`, and return indistinguishable 404 for missing/foreign records.
- [X] T021 [US2] Implement vehicle form validation and combustion/electric fuel-type interaction in `frontend/src/features/vehicles/validation.ts` and `frontend/src/features/vehicles/components/VehicleForm.tsx`; expose required accessible labels and field-level safe API errors.
- [X] T022 [US2] Add labeled Add vehicle and Edit actions, dialog/form lifecycle, busy/error/success feedback, and Redux updates to `frontend/src/features/vehicles/components/VehicleManagementPage.tsx` and `frontend/src/features/vehicles/vehiclesApi.ts`.

**Checkpoint**: US2 passes its independent test: users can create/edit persisted records with valid inputs, while invalid submissions are rejected by both backend boundary and UI feedback.

---

## Phase 5: User Story 3 - Delete my vehicles (Priority: P2)

**Goal**: Let an authenticated owner remove a vehicle after explicit confirmation or cancel safely.

**Independent Test**: Delete one of multiple vehicles and verify only that record disappears; cancel deletion of another and verify it remains; confirm a second user cannot delete either record.

### Tests for User Story 3

- [X] T023 [P] [US3] Add delete contract and ownership tests in `backend/tests/test_vehicle_delete.py` for 200 `{data:{status:"deleted"}}`, 401/403, foreign/unknown indistinguishable 404, and unchanged records after denied attempts.
- [X] T024 [P] [US3] Add browser confirmation scenarios in `frontend/tests/vehicles-delete.spec.ts` for confirming deletion, canceling deletion, accessible dialog focus/labels, and list update only after success.

### Implementation for User Story 3

- [X] T025 [US3] Implement owner-scoped physical deletion in `backend/src/vehicles/service.py` and `backend/src/vehicles/routes.py`; return `{ "data": { "status": "deleted" } }` with HTTP 200, and return the same safe 404 for missing or foreign-owned IDs.
- [X] T026 [US3] Add per-vehicle Delete action and accessible confirmation dialog in `frontend/src/features/vehicles/components/VehicleDeleteDialog.tsx`; identify the selected vehicle and support confirm, cancel, keyboard focus return, pending, and error states.
- [X] T027 [US3] Connect confirmed delete to `frontend/src/features/vehicles/vehiclesApi.ts`, update `frontend/src/features/vehicles/vehiclesSlice.ts` only after success, and preserve the row on failure or cancellation.

**Checkpoint**: US3 passes its independent test: confirmed deletion removes only the owner's selected vehicle; cancel and denied cross-account calls leave all records unchanged.

---

## Phase 6: User Story 4 - Navigate between app pages (Priority: P2)

**Goal**: Provide a consistent, accessible authenticated navigation bar that reaches Profile and My vehicles and marks the current page.

**Independent Test**: Navigate between `/profile` and `/vehicles` using keyboard and pointer; verify current page indication, usable narrow layout, and absence from public auth screens.

### Tests for User Story 4

- [X] T028 [P] [US4] Add browser navigation scenarios in `frontend/tests/account-navigation.spec.ts` for visible Profile/My vehicles links, `aria-current="page"`, keyboard access, narrow viewport behavior, and no authenticated navigation on `/login` or `/register`.

### Implementation for User Story 4

- [X] T029 [US4] Build a reusable accessible navigation bar in `frontend/src/components/AppNavigation.tsx` using the screenshot's navy/cyan direction, links only to implemented `/vehicles` and `/profile` routes, clear focus state, and active-page semantics.
- [X] T030 [US4] Add `frontend/src/app/(account)/layout.tsx` to render `AppNavigation` around the existing Profile and vehicle pages; remove any duplicated page chrome from `frontend/src/features/auth/components/ProfilePage.tsx` while preserving profile behavior.
- [X] T031 [US4] Verify protected route handling remains in `frontend/src/features/vehicles/components/VehicleManagementPage.tsx` and `frontend/src/features/auth/components/ProfilePage.tsx`; keep `/login` and `/register` outside the account layout and do not add trip-planning/history destinations.

**Checkpoint**: US4 passes its independent test: every currently implemented authenticated destination is reachable in one selection, current location is announced accessibly, and public authentication screens remain separate.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify that the complete cross-layer feature meets the contracts, constitution, quickstart, accessibility, and compatibility expectations.

- [X] T032 [P] Review all vehicle request/response and error shapes against `specs/006-vehicle-management/contracts/vehicles-api.md`; verify `backend/src/main.py` still returns the unchanged `/health` response.
- [X] T033 [P] Review the frontend against `specs/006-vehicle-management/contracts/vehicles-ui.md` and `docs/reference-ui/my_vehicles.png`; verify responsive cards, accessible labels, alerts, dialog focus, and active navigation.
- [X] T034 Run the documented backend validation commands from `specs/006-vehicle-management/quickstart.md` (`python -m compileall src` and `python -m pytest` from `backend/`) and resolve failures.
- [X] T035 Run the documented frontend validation commands from `specs/006-vehicle-management/quickstart.md` (`npm run type-check`, `npm run build`, and `npm run test:e2e` from `frontend/`) and resolve failures.
- [X] T036 Update `backend/README.md` and `frontend/README.md` with vehicle endpoint/page behavior and setup/verification references only where the feature changes contributor-facing guidance.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; confirms project structure and existing pins.
- **Foundational (Phase 2)**: Depends on setup and blocks all stories because model, migration, router/schema, shared state, and API error mapping are shared prerequisites.
- **US1 (Phase 3)**: Depends on foundation; establishes list/read and the page shell.
- **US2 (Phase 4)**: Depends on foundation and the US1 page/list to integrate the Add/Edit form; its backend mutation routes remain owner-scoped.
- **US3 (Phase 5)**: Depends on foundation and the US1 list for UI integration. Its deletion behavior is independently testable with seeded records and does not require US2's create flow; the phase follows US2 to avoid concurrent edits to shared service, route, API, and Redux files.
- **US4 (Phase 6)**: Depends on the `/vehicles` and `/profile` routes established in US1 and the existing profile feature; then wraps both in the shared authenticated layout.
- **Polish (Phase 7)**: Depends on all selected story checkpoints.

### User Story Dependency Graph

```text
Setup -> Foundational -> US1 (View)
                         |  \ \
                         |   \ -> US4 (Navigation)
                         | -> US2 (Add/Edit) -> US3 (Delete)
                         \___________________________/
                                      -> Polish
```

US2 and US4 can proceed in parallel after US1 if separate contributors own their files; US3 follows after US2 for the complete lifecycle demo, though its backend/UI slice can be verified with seeded fixtures once US1 exists.

### Parallel Opportunities

- T002 and T004 can proceed in parallel after T001 because they edit separate model/schema files. T006 and T007 can proceed in parallel after T001; shared-store registration T006 and API module T007 have distinct files.
- Within US1, T009–T011 are separate test files and may be authored in parallel before implementation. T012, T013, and T014 have separable backend/API/UI files after those tests; T015 depends on T014.
- Within US2, T016–T018 are separate tests and may be authored in parallel. T019 and T021 are separate validation modules; T020 follows schema work and T022 integrates frontend form/API/slice behavior.
- Within US3, T023 and T024 are separate tests and may be authored in parallel. T025 (backend) and T026 (dialog) may be implemented in parallel after their tests; T027 integrates dialog and API/state.
- T032 and T033 are independent documentation/review tasks. The user story sequence is otherwise sequential to avoid route/component integration conflicts.

## Parallel Example: User Story 1

```text
Task: T009 - Write list contract tests in backend/tests/test_vehicle_list.py
Task: T010 - Write read ownership tests in backend/tests/test_vehicle_read_authorization.py
Task: T011 - Write list/empty-state browser tests in frontend/tests/vehicles-list.spec.ts

After those tests are in place:
Task: T012 - Implement owner-scoped list/detail operations in backend/src/vehicles/routes.py and backend/src/vehicles/service.py
Task: T013 - Implement frontend vehicle list API and Redux population in frontend/src/features/vehicles/vehiclesApi.ts and frontend/src/features/vehicles/vehiclesSlice.ts
Task: T014 - Build the list page in frontend/src/features/vehicles/components/VehicleManagementPage.tsx and frontend/src/app/(account)/vehicles/page.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 Setup and Phase 2 Foundational.
2. Complete Phase 3 US1: owner-scoped list/detail, garage page, empty/loading/error states.
3. Validate US1 independently with authenticated seeded and empty accounts.
4. Continue to US2 to make the visible Add action and Edit affordances functional; complete US3 for deletion and US4 for shared navigation before the full feature release.

### Incremental Delivery

1. Setup + Foundation establishes schema and shared integration points.
2. US1 delivers a usable view-only personal garage.
3. US2 enables add/edit and complete vehicle data maintenance.
4. US3 completes deletion lifecycle.
5. US4 adds shared app navigation to existing authenticated pages.
6. Polish runs the complete documented cross-layer validation.

## Notes

- `[P]` means files are independent and the task has no unfinished prerequisite.
- `[US1]`–`[US4]` map to the numbered user stories in `spec.md`.
- Implement backend authorization for every protected operation; frontend route visibility is not authorization.
- Do not add Plan a trip or Trip history routes under this feature.
- Keep `/health` unchanged and do not add dependencies.

## Phase 8: Convergence

**Purpose**: Close the remaining verification gap found when comparing the implementation with the specification and constitution.

- [X] T037 [US1] [US2] [US3] Add backend authorization coverage in `backend/tests/test_vehicle_read_authorization.py` and `backend/tests/test_vehicle_mutations.py` for active `user`, `admin`, and `producer` accounts, confirming each role can manage its own vehicles while foreign vehicle reads and writes remain denied (coverage gap, low severity; spec assumption and FR-005, constitution principle IV).

## Phase 9: Convergence

**Purpose**: Verify recovery behavior for failed vehicle mutations, including input and list retention.

- [X] T038 [US2] [US3] Add browser scenarios in `frontend/tests/vehicles-create-edit.spec.ts` and `frontend/tests/vehicles-delete.spec.ts` that force create/edit/delete requests to fail, assert understandable feedback and preserved form input/list items, then retry successfully per FR-008, the vehicle-management edge cases, the UI contract, and Constitution V (partial, medium).

## Phase 10: Convergence

**Purpose**: Verify shared garage state retention and owner-state clearing across refresh failures and session loss.

- [X] T039 [US1] Add browser scenarios in `frontend/tests/vehicles-list.spec.ts` that verify a failed refresh preserves the last loaded vehicles and session loss clears the prior owner's collection before another account uses the garage, per T015, FR-007, FR-008, the UI contract, and Constitution III/V (partial, medium).

