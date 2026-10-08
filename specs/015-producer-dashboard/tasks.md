# Tasks: Producer Dashboard

**Input**: Design documents from `/specs/015-producer-dashboard/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, and `contracts/producer-report.md`

## Phase 1: Foundation and Data Lifecycle

- [x] T001 [P] Add brand/archive fields and indexes to `backend/src/data/models/vehicle.py` and export any new feature models from `backend/src/data/models/__init__.py`.
- [x] T002 Create `backend/migrations/versions/0009_producer_dashboard.py` merging `0006_trip_history` and `0008_vehicle_image_upload`, then adding nullable vehicle brand/archive columns and index.
- [x] T003 [P] Extend `backend/src/vehicles/schemas.py` with brand validation/response and preserve the existing Electric/Combustion constraints.
- [x] T004 Update `backend/src/vehicles/service.py` so owner reads/mutations are active-only and vehicle deletion stamps `archived_at` instead of physically deleting.
- [x] T005 Update vehicle brand handling in `frontend/src/features/vehicles/vehiclesSlice.ts`, `vehiclesApi.ts`, `validation.ts`, and `components/VehicleForm.tsx` so creates require brand and existing unbranded vehicles can be associated when edited.
- [x] T006 Update admin vehicle listing/counts in `backend/src/admin/routes.py` to keep archived vehicles out of existing active vehicle results.
- [x] T007 Add regression tests in `backend/tests/test_vehicle_brand_archive.py` for required/trimmed brand, legacy null brand, owner active-only list/detail/mutation behavior, archive-on-delete, and admin active-only results.

## Phase 2: User Story 1 - Protected Brand Report (P1)

**Goal**: Provide a Producer-only endpoint and role-isolated dashboard/profile destinations.
**Independent Test**: Verify unauthenticated, user, admin, and Producer report access; verify brand isolation and no personal owner data.

- [x] T008 [P] Add typed Producer request/response DTOs in `backend/src/producer/schemas.py` and role dependency in `backend/src/producer/dependencies.py`.
- [x] T009 Implement normalized company scoping and report aggregation in `backend/src/producer/service.py`.
- [x] T010 Add `GET /producer/report` in `backend/src/producer/routes.py` and include it in `backend/src/main.py` using the existing `data` envelope and safe errors.
- [x] T011 [P] Add typed report contract and request function in `frontend/src/features/producer/producerTypes.ts` and `producerApi.ts`.
- [x] T012 Implement `/producer` authorization/layout and dashboard route in `frontend/src/app/producer/layout.tsx` and `frontend/src/app/producer/page.tsx`.
- [x] T013 Restrict Producer navigation to `/producer` and `/producer/profile` and redirect Producer visits to other authenticated-user pages in `frontend/src/components/AppNavigation.tsx`.
- [x] T014 Add `/producer/profile` in `frontend/src/app/producer/profile/page.tsx`, reusing the existing profile feature with Producer navigation.
- [x] T015 Add backend contract/integration coverage in `backend/tests/test_producer_dashboard.py` for auth matrix, no-brand error, case/space normalization, brand isolation, response envelope, and PII exclusion.

## Phase 3: User Story 2 - Fleet, Routes, and Saved Trips (P1)

**Goal**: Show accurate active/all-time fleet and route-distance analytics sourced from saved trips.
**Independent Test**: Use known fixture vehicles and trips to verify counts, route rankings/per-vehicle breakdowns, recent history, and distance sum.

- [x] T016 Include vehicle brand in future saved `vehicle_snapshot` objects in `backend/src/trips/service.py`; keep existing save-only semantics.
- [x] T017 Complete aggregate calculations in `backend/src/producer/service.py` for current/history vehicle types, used vehicles, users, trips, kilometers, normalized routes, per-vehicle route data, recent trips, and fleet timeline.
- [x] T018 Add component tests in `backend/tests/test_producer_dashboard.py` covering archived vehicles with saved trips, route grouping, users/vehicle uniqueness, exact distance sums, both supported types, and empty reports.
- [x] T019 Build focused responsive dashboard sections in `frontend/src/features/producer/components/` for metric cards, vehicle-type donut, fleet overview/timeline, route ranking/per-vehicle data, and recent trips.
- [x] T020 Wire loading, zero/empty, safe error, and Retry states into the dashboard and ensure report subcomponents receive only typed report data.
- [x] T021 Add `frontend/tests/producer-dashboard.spec.ts` for report values, empty state, loading/error/retry, route rendering, no owner PII, and responsive layout.

## Phase 4: User Story 3 - Shared Light/Dark Theme (P2)

**Goal**: Reuse the Admin theme preference and toggle behavior on Producer dashboard/profile.
**Independent Test**: Toggle themes, navigate dashboard/profile, reload, and verify contrast and stored preference.

- [x] T022 Extract the Admin theme preference/toggle into `frontend/src/components/DashboardThemeMode.tsx` or a focused hook/component and update `frontend/src/app/admin/layout.tsx` without changing current Admin behavior.
- [x] T023 Apply the shared theme in Producer layout and use MUI theme palette tokens for charts, tables, cards, borders, navigation, and states.
- [x] T024 Extend `frontend/tests/producer-dashboard.spec.ts` with light/dark persistence and contrast/rendering checks for both Producer routes.

## Phase 5: Integration and Review

- [ ] T025 Run `alembic heads` and upgrade/downgrade migration validation against a disposable SQLite database; confirm exactly one head and preservation of existing records.
- [x] T026 Run focused backend tests and the full existing backend suite; resolve regressions in trip, vehicle, and admin behavior.
- [ ] T027 Run frontend type-check, focused Playwright tests in both themes, and existing vehicle/admin e2e tests.
- [x] T028 Review changed files against `spec.md`, API contract, security/PII scope, accessibility, responsive behavior, existing theme behavior, and migration branch merge; record any remaining limits.

## Verification notes

- Backend suite: 212 passed; 4 live-routing tests failed because the external routing provider returned unavailable/inconsistent route data. Producer, vehicle, trip-history, and admin tests passed.
- Frontend: TypeScript check passed; all 4 Producer Playwright tests passed, including light/dark computed background colors. Existing admin/vehicle Playwright selectors are stale relative to the current English UI and need separate maintenance.
- `alembic heads` reports one head (`0009_producer_dashboard`). The Playwright backend startup successfully applied `upgrade head` to its isolated test database. Downgrade validation remains pending.

## Dependencies and Order

- Phase 1 is foundational. T002 must be based on both existing Alembic heads. T003–T006 are required before the report can query brands/archive status.
- In Phase 2, schemas/dependency can be written alongside frontend API types. The service depends on T001–T004. Route inclusion depends on backend service/schema. UI route depends on typed API and role behavior.
- Phase 3 trip snapshot and aggregation depend on the brand/archive schema. UI sections consume the stable typed report contract.
- Phase 4 can reuse the existing Admin design after the Producer route exists; tests follow both integrations.
- Phase 5 must pass before completion.
