---
description: "Implementation task list for vehicle image preview"
---

# Tasks: Vehicle Image Preview

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), and [contracts/vehicle-image-api.md](contracts/vehicle-image-api.md).

**Organization**: Shared persistence and contract foundation first, followed by the three P1 user stories in the specification. Each task names its implementation/test paths and traces to requirements.

**Tests**: Included as requested. Tests should be authored before the implementation tasks for the same behavior. Do not count a skipped provider-backed case as a pass; prefer deterministic Commons fixtures for matching and failure cases.

## Phase 1: Foundational Data Model and Contract

**Purpose**: Additive persistence/API shape that supports all user stories while preserving existing vehicle records and clients.

- [x] T001 [P] Add migration coverage in `backend/tests/test_vehicle_image_migration.py` proving existing vehicles upgrade with null image metadata, image metadata columns accept a complete association, and downgrade removes only the added columns. (FR-003, FR-008, FR-011)
- [x] T002 Add nullable Commons image and attribution fields to `backend/src/data/models/vehicle.py` and create `backend/migrations/versions/0006_vehicle_image_preview.py` after `0005_admin_dashboard`; leave existing rows unbackfilled and valid. (FR-003, FR-008, FR-011)
- [x] T003 Extend `backend/src/vehicles/schemas.py` with typed image/preview responses and optional `image_file_title` inputs; preserve existing vehicle fields, validation, envelope conventions, and generated OpenAPI compatibility. (FR-001, FR-003, FR-008, FR-009, FR-011)

**Checkpoint**: Existing vehicle records can be read with `image: null`; API schemas express only a Commons file title as the client image selection.

## Phase 2: User Story 1 — Preview an image while adding or editing (P1)

**Goal**: Show a clearly attributed representative image only when Commons metadata supports the entered make/model/year; ignore stale lookup results.

**Independent Test**: Enter a supported vehicle and observe an attributed preview before save; change the query while responses are delayed and confirm the old result cannot replace the current preview.

### Tests for User Story 1

- [x] T004 [P] [US1] Add deterministic Commons search/matching tests in `backend/tests/test_vehicle_image_provider.py` for exact make/model/year, explicit model-year span, approximate same-model year, unrelated model, missing metadata, and unlicensed results; assert the documented supported-query fixtures meet the 90% match criterion. (FR-001, FR-002, FR-008, SC-001, SC-004)
- [x] T005 [P] [US1] Add preview API tests in `backend/tests/test_vehicle_image_api.py` for authenticated access, input validation, matched/fallback envelope shapes, and safe provider failure behavior. (FR-001, FR-002, FR-009, FR-012)
- [x] T006 [P] [US1] Add Playwright coverage in `frontend/tests/vehicle-image-preview.spec.ts` for matched preview, visible attribution, add/edit query changes, and out-of-order lookup responses. (FR-001, FR-002, FR-004, FR-008, SC-001, SC-004)

### Implementation for User Story 1

- [x] T007 [US1] Implement `backend/src/vehicles/image_provider.py` to query Commons file namespace results, request only needed image/`extmetadata` fields, normalize model variants, rank exact make/model/year matches first and accept same-core-model matches as `similar`, validate HTTPS media/license URLs, and retain bounded requests/cache. (FR-001, FR-008, FR-009, FR-012)
- [x] T008 [US1] Add the authenticated `GET /vehicles/image-preview` handler in `backend/src/vehicles/routes.py` before `/{vehicle_id}`; return a match or fallback through the success envelope and hide provider errors. (FR-001, FR-002, FR-008, FR-009, FR-012)
- [x] T009 [US1] Extend `frontend/src/features/vehicles/vehiclesApi.ts` with typed preview request/response support and safe fallback handling; do not call Commons from the browser. (FR-001, FR-009, FR-012)
- [x] T010 [US1] Update `frontend/src/features/vehicles/components/VehicleForm.tsx` to debounce lookup after make/model/year input, show loading/matched/fallback states and license attribution, and ignore or cancel results for outdated queries. (FR-001, FR-002, FR-004, FR-008, FR-012)

**Checkpoint**: Add and edit forms show only a current, sufficiently supported image; ambiguous and failed lookups stay non-blocking and visibly use the generic fallback.

## Phase 3: User Story 2 — See the saved image in the garage (P1)

**Goal**: Persist a verified image association with its vehicle and show it with attribution after save, navigation, and reload.

**Independent Test**: Save a vehicle with a match, reload the garage, and verify its card displays the same Commons image and attribution; verify existing vehicles still show normally with fallback.

### Tests for User Story 2

- [x] T011 [P] [US2] Extend `backend/tests/test_vehicle_persistence.py` and `backend/tests/test_vehicle_mutations.py` to cover persisting and returning image metadata, rejecting a file title that is not a current candidate, preserving the image on unrelated edits, clearing/replacing it when make/model/year changes, and owner-isolated image mutations. (FR-003, FR-008, FR-011, SC-003, SC-004)
- [x] T012 [P] [US2] Extend `frontend/tests/vehicle-image-preview.spec.ts` to verify preview selection is saved, the garage card shows image/creator/license, and reload retains the association. (FR-003, FR-007, FR-008, SC-003, SC-004)

### Implementation for User Story 2

- [x] T013 [US2] Extend vehicle create/update behavior in `backend/src/vehicles/service.py` to associate only a backend-verified Commons candidate and persist its file title, media URL, file page, creator, license name, license URL, and exact/similar classification; keep ownership checks unchanged. (FR-003, FR-008, FR-011)
- [x] T014 [US2] Extend the saved vehicle type in `frontend/src/features/vehicles/vehiclesSlice.ts` and its API response typing in `frontend/src/features/vehicles/vehiclesApi.ts` so Redux list/read/create/update flows retain the nullable nested image association. (FR-003, FR-007, FR-008, FR-011)
- [x] T015 [US2] Update `frontend/src/features/vehicles/components/VehicleManagementPage.tsx` to render the saved Commons image, accessible alt text, a similar-match label when needed, and nearby creator/source/license links. (FR-003, FR-007, FR-008)

**Checkpoint**: The same persisted, verified image and its attribution appear after garage reload; vehicles without an association remain valid.

## Phase 4: User Story 3 — Continue when an image is unavailable (P1)

**Goal**: Provider, license, lookup, and image-rendering failures never block valid vehicle saves or expose internal/provider details.

**Independent Test**: Simulate no match, timeout, rate limit, unusable metadata, and a broken media URL; save valid vehicle details in each case and verify generic fallback behavior.

### Tests for User Story 3

- [x] T016 [P] [US3] Extend `backend/tests/test_vehicle_image_provider.py` and `backend/tests/test_vehicle_image_api.py` with Commons timeout, HTTP/API error, 429/`Retry-After`, malformed/partial metadata, disallowed license, and no-match cases. (FR-005, FR-006, FR-008, FR-012, SC-002, SC-005)
- [x] T017 [P] [US3] Add backend create/patch tests in `backend/tests/test_vehicle_mutations.py` proving provider failure never blocks vehicle field persistence, unchanged identity retains the existing image, changed identity clears the old image when lookup fails, and unrelated edits preserve it. (FR-005, FR-011, FR-012, SC-002, SC-005)
- [x] T018 [P] [US3] Extend `frontend/tests/vehicle-image-preview.spec.ts` with no-match, unavailable-service, pending-lookup save, broken-image, generic-alt-text, and edit fallback cases; confirm valid vehicle save remains enabled. (FR-005, FR-006, FR-007, FR-012, SC-002, SC-005)

### Implementation for User Story 3

- [x] T019 [US3] Make provider timeouts, rate limits, malformed responses, invalid licenses, and image resolution failures return non-blocking fallback semantics in `backend/src/vehicles/image_provider.py`, `backend/src/vehicles/routes.py`, and `backend/src/vehicles/service.py`; never return raw provider error details. (FR-005, FR-008, FR-012)
- [x] T020 [US3] Add a local model-neutral 2D fallback asset at `frontend/public/images/generic-vehicle.svg`; use it for missing/ambiguous/unavailable images and on remote image `onError`, with explicit generic alt text and understandable non-blocking feedback. (FR-005, FR-006, FR-007, FR-012)

**Checkpoint**: Valid vehicle create/edit works with Commons unavailable, and no stale or misleading exact-model image remains visible after identity changes.

## Phase 5: Cross-Cutting Verification and Scope Review

**Purpose**: Confirm complete coverage, accessibility, contract compatibility, and feature boundaries.

- [x] T021 [P] Verify image attribution/metadata rendering, keyboard interaction, responsive form/card layouts, and safe text/link rendering from provider metadata in `frontend/tests/vehicle-image-preview.spec.ts`. (FR-007, FR-008, FR-012, SC-004)
- [x] T022 Verify additive API behavior and migration compatibility across `backend/tests/test_api_conventions.py`, `backend/tests/test_schema_evolution.py`, and the feature's vehicle image tests; confirm owner authorization remains enforced for all vehicle reads/mutations. (FR-003, FR-009, FR-011, SC-003, SC-005)
- [x] T023 Run the planned backend pytest coverage and frontend `npm run type-check` plus focused Playwright vehicle tests; record actual results and any environment/provider limitations in the review. Do not count skipped cases as passing. (FR-001–FR-012, SC-001–SC-005)
- [x] T024 Review the final diff against `specs/013-vehicle-image-preview/spec.md`; confirm no route planning/autonomy code, VIN/plate fields, AI/3D behavior, Commons image binary cache, or unrelated vehicle semantics were added. (FR-010, FR-011)

## Phase 6: User Photo Priority and Car-Only Candidate Filtering

**Purpose**: Let owners supply the right photo and reduce Commons false positives using conservative metadata checks.

- [x] T025 Extend Commons lookup to request categories, require car/automobile evidence, and reject toys, scale models, miniatures, kits, logos, drawings, and unsupported metadata; cover positive and negative fixtures in `backend/tests/test_vehicle_image_provider.py`. (FR-013)
- [x] T026 Add owner-scoped raw image upload/content endpoints, MIME signature and 5 MiB checks, deferred BLOB persistence, and explicit discard semantics with migration `0008_vehicle_image_upload.py`; cover ownership, persistence, private headers, invalid/oversized input, retention, and discard in `backend/tests/test_vehicle_image_api.py`. (FR-014, FR-015, FR-016)
- [x] T027 Add JPEG/PNG/WebP selection, local preview, upload precedence, saved-photo retention, and explicit discard controls to `VehicleForm`/garage display; cover upload, saved state, and discard in `frontend/tests/vehicle-image-preview.spec.ts`. (FR-014, FR-015)
- [x] T028 Update this specification, plan, data model, research, and API contract to document car-only metadata filtering, private user uploads, precedence, limits, and fallback behavior. (FR-013-FR-016)
- [x] T029 Verify the focused backend vehicle-image suite (34 passed), frontend TypeScript check, and all vehicle-image Playwright scenarios (3 passed); note that metadata filtering is conservative rather than visual recognition. The full backend suite also ran (201 passed, 3 live route-preview integration failures unrelated to vehicle images). (FR-013-FR-016)

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 — Data model and contract**: T001–T003 establish migration/schema shape and block dependent persistence/response work.
- **Phase 2 — US1 preview**: T004–T006 define deterministic tests; T007–T010 implement provider preview and the add/edit form.
- **Phase 3 — US2 garage persistence**: T011–T012 define persistence/UI tests; T013–T015 integrate verified image metadata with CRUD and garage display. Depends on the association shape from Phase 1 and preview result from Phase 2.
- **Phase 4 — US3 fallback**: T016–T018 define failure-path coverage; T019–T020 complete fallback semantics and local asset. Uses provider/API from Phase 2 and saved-image lifecycle from Phase 3.
- **Phase 5 — Verification**: T021–T024 follow implementation and review all requirements. Do not change route or range behavior.

### Parallel Opportunities

- T001 can be authored alongside the provider/API preview tests T004–T005; T002 and T003 follow the tests that establish their expected behavior.
- T006 can be authored alongside T004–T005 because it uses a separate frontend test file.
- In Phase 3, T011 and T012 can proceed in parallel. Backend persistence implementation T013 can proceed separately from the frontend garage card T015 after the API response contract is stable in T014.
- In Phase 4, backend failure tests T016–T017 and frontend fallback test T018 use separate files and can be prepared in parallel; implementation must preserve the single fallback contract across layers.

## Implementation Strategy

1. Deliver the additive model/migration and typed response/request contract; existing rows map to fallback.
2. Deliver US1 preview using deterministic provider fixtures and stale-response protection.
3. Deliver US2 verified persistence and garage card attribution.
4. Deliver US3 failure-safe save and generic 2D fallback.
5. Run the planned checks and record actual results before marking tasks complete.

## Notes

- `[P]` marks tasks that can be developed in parallel without editing the same files or depending on unfinished shared semantics.
- `[US1]`, `[US2]`, and `[US3]` map to the user stories in `spec.md`.
- Every task names the relevant functional requirements or success criteria.
- The task list plans tests; it does not mean they have been implemented or run.
- Implementation must follow the official Commons license for each selected file and Wikimedia API request guidance; no application code is changed by this task-generation step.


## Verification Results

- [x] T025a Update the vehicle image model/API contracts and migration to persist `image_match_kind` (`exact` or `similar`) for durable UI labeling. (FR-003, FR-006, FR-008)
- [x] T026a Cover compact model spelling, same-model results without/excluding year, exact-match preference, deterministic ties, and preview/garage labeling for similar matches. (FR-001, FR-002, FR-003, FR-006, FR-008)

- Historical feature/backend regression: `40 passed, 1 warning` across migration, Commons provider, image API, vehicle persistence/mutations, API conventions, and schema evolution tests.
- Historical full backend suite (before the final Commons query/thumbnail fix): `193 passed, 3 failed`; the failures were unrelated live route-preview assertions in `tests/test_trip_preview.py` (`test_live_route_preview_includes_range_reachable_stops` and both `fastest`/`shortest` cases of `test_live_route_preview_reports_no_feasible_station_chain`). Route-planning files were not changed by this feature.
- Live Commons check for the exact Audi values: matched the file and returned its CC BY 2.0 attribution metadata after the query/host fix.
- Frontend `npm run type-check`: passed.
- Focused Playwright `tests/vehicle-image-preview.spec.ts`: `1 passed`; covers stale lookup protection, attribution, persistence/reload, edit fallback, unavailable lookup, save during a pending lookup, broken-image fallback, keyboard focus, and mobile overflow.
- Broader existing vehicle Playwright run: the new feature test passed; two legacy vehicle UI tests timed out, and the run was stopped before the remaining legacy cases. They are not counted as passes.
- Scope review: no route-planning, autonomy/range, VIN, plate, AI, 3D, or image-binary persistence code was added or modified.

## Similar-match follow-up (2026-10-07)

- [x] T027a Normalize Romanian BMW `Seria N` model input to Commons `N Series` terms without changing the saved vehicle text. (FR-001, FR-008)
- Provider verification for `BMW` + `Seria 4` against a `BMW 4 Series 2020` fixture: passed; image classified exact with the entered year.

- Updated `spec.md`, `research.md`, `data-model.md`, and `contracts/vehicle-image-api.md`: year remains required on the vehicle but is a soft image-ranking preference; a same-core-model result with missing/different year is labeled and persisted as `similar`.
- Added migration `0007_vehicle_image_match_kind.py` and propagated `match_kind` through the backend model/API, Redux type, and shared preview/garage image display.
- Backend focused run: `31 passed, 1 warning` across Commons matching, vehicle API, migration, persistence, and mutation/ownership tests.
- Alembic `upgrade head` and downgrade to `0005_admin_dashboard` passed against an isolated temporary database.
- Frontend `npm run type-check`: passed.
- Playwright focused similar-match flow: `1 passed`; it verifies Tesla Model 3 preview labeling and the same label after save. A separate rerun at that time of the longer existing preview scenario failed at its reload assertion (garage displayed zero vehicles); that historical failure was not counted as passing. See the current checkout verification below for the latest full focused Playwright result.
- A direct backend live Commons lookup from this workspace could not connect because the local network proxy refused the connection. No Commons token/subscription is needed; the backend needs outbound access to Wikimedia. The generic fallback remains in effect when it cannot connect.

## Phase 7: Current Checkout Convergence Follow-ups

**Purpose**: Resolve issues found when validating this feature against the integrated repository state. These tasks are new and remain unchecked until their acceptance evidence is recorded.

- [x] **T030** Reconcile the Alembic revision graph so `alembic upgrade head` resolves to one unambiguous head after trip-history and vehicle-image migrations are integrated. Do not rewrite already-applied migration revisions. Add/update isolated-database coverage in `backend/tests/test_vehicle_image_migration.py`, `backend/tests/test_vehicle_persistence.py`, and `backend/tests/test_schema_evolution.py`; verify upgrade from `0005_admin_dashboard`, upgrade to the unified head, repeated upgrade, and downgrade paths without losing existing rows or either feature's columns. (FR-003, FR-008, FR-011, FR-016; plan: additive migration and migration compatibility)
- [x] **T031** Reconcile the repeated task identifiers `T025`, `T026`, and `T027` in the verification and similar-match follow-up sections so each distinct task has a unique identifier. Preserve existing checked states and their historical evidence; do not use this documentation cleanup to imply a test passed. (Traceability and review requirements in the project constitution; tasks.md integrity)
- [x] **T032** After T030 is resolved, rerun the complete planned vehicle-image backend/API/migration/schema suite, frontend type-check, and focused Playwright image-preview suite; update this file's verification record with the current checkout's actual outcomes, clearly separating historical runs, failures, and skipped checks. Do not mark this task complete unless each reported result is reproducible and no failed or skipped test is described as passed. (FR-001–FR-016, SC-001–SC-005; plan: testing and migration compatibility)

### Current checkout convergence verification (2026-10-07)

- Alembic heads before the merge: `0006_trip_history` and `0008_vehicle_image_upload`.
- Added no-op merge revision `0009_merge_trip_vehicle_heads`, with both prior heads as parents; no existing revision was changed or removed.
- `alembic heads` after the merge: single head `0009_merge_trip_vehicle_heads`.
- Isolated database: `alembic upgrade head` succeeded; `alembic current` reported `0009_merge_trip_vehicle_heads (head)`.
- Focused backend suite (vehicle image migration/provider/API, vehicle persistence/mutations, API conventions, schema evolution): `48 passed, 1 warning`.
- Frontend `npm run type-check`: passed.
- Focused Playwright `tests/vehicle-image-preview.spec.ts`: `3 passed`.

- [x] **T033** Add API tests proving that an unauthenticated request and a different authenticated account cannot read a vehicle's private uploaded-image content; assert that neither request discloses image bytes, while the owner can still read the image with the required private/no-store headers. Keep the existing ownership and response contract; do not change application code in this task. (FR-016; constitution: server-side authorization and privacy)
- T033 verification: `python -m pytest tests/test_vehicle_image_api.py tests/test_vehicle_mutations.py -q` — `19 passed, 1 warning`; verified owner content and privacy headers, foreign-account `404 vehicle_not_found`, anonymous `401 authentication_required`, and no image bytes in either rejected response.
