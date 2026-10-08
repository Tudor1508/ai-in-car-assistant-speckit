# Implementation Plan: Producer Dashboard

**Branch**: `015-producer-dashboard` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Summary

Add a brand-scoped, role-protected Producer report using the current account brand, explicit vehicle brands, and saved `TripHistory` rows. Archive vehicle removals with a nullable timestamp, preserving active garage behavior while enabling all-time fleet and historical trip reporting. Build a responsive MUI dashboard and Producer-only navigation/profile area, sharing the Admin light/dark theme preference and toggle behavior.

## Technical Context

**Language/Version**: Python version from backend project config; TypeScript/React 19.3 and Next.js 16.3.7 from the frontend manifest.
**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy, Alembic, Next.js App Router, React Redux, MUI 9.4.0.
**Storage**: Existing SQLAlchemy persistence; migration is SQLite-compatible and remains a single Alembic head.
**Testing**: Existing pytest backend suite, frontend TypeScript check, and Playwright e2e suite for Producer UI/auth/theme behavior.
**Target Platform**: Existing web app and backend.
**Project Type**: Full-stack web application.
**Performance Goals**: One aggregate report request; aggregate only vehicles and saved trips matching one normalized brand.
**Constraints**: No new runtime dependency; no personal owner data in Producer response; no changes to trip-save semantics; user-requested two existing vehicle types only; null legacy brands remain unassociated.
**Scale/Scope**: One dashboard, one profile destination, a read-only report endpoint, and the minimum vehicle schema/form and archive lifecycle changes needed to make the report accurate.

## Constitution Check

- **I. Boundaries/ownership**: Backend owns aggregation, brand matching, archive semantics, and authorization; frontend owns MUI dashboard presentation and calls documented API.
- **II. Compatible frontend**: Next.js App Router, typed React components, MUI, and the installed dependency versions are reused; no chart package added.
- **III. Shared state**: Report is loaded once by the dashboard and passed as typed props to focused visual components; there is no second cross-page copy of report state.
- **IV. Explicit contracts/access**: `GET /producer/report` has a documented response and uses current session authentication plus a Producer-role dependency. Response excludes personal fields.
- **V. Verified outcomes**: Backend integration tests cover role denial, normalized company isolation, aggregation, archive and empty cases. Frontend tests cover navigation, loading/error/empty, theme, and key rendering.
- **SDD**: This spec, plan, research, data model, API contract, and tasks are created before implementation.
- **Review gate**: Final diff reviewed for migration-chain correctness, role isolation, personal data exposure, regression of owner/admin vehicle paths, accessibility, and acceptance criteria.

## Research Summary

See [research.md](research.md). Key resolutions: reuse session auth, `Account.brand`, `TripHistory`, MUI, the Admin localStorage theme key, and existing saved-trip semantics; keep `electric` and `combustion`; normalize brand and route labels; preserve legacy null brands without guessing; archive instead of physical vehicle deletion.

## Data and API Design

See [data-model.md](data-model.md) and [contracts/producer-report.md](contracts/producer-report.md).

- Add nullable `vehicles.brand` and `vehicles.archived_at`, with a composite brand/archive index. Preserve current rows with `brand = NULL`; do not backfill from vehicle names/models.
- New vehicle creation requires brand. Vehicle update allows the owner to set or change it. Existing null-brand vehicles become attributable after the owner edits them.
- DELETE `/vehicles/{vehicle_id}` retains the existing safe response/status but stamps `archived_at`; active vehicle reads, writes, and admin vehicle results exclude archived rows.
- Producer aggregation matches `upper(trim(vehicles.brand)) == upper(trim(account.brand))`, counts active and all-time fleet, and aggregates attributable saved trips. New saved trip snapshots include brand; older snapshots use the retained vehicle row's brand fallback.
- Merge the current migration heads `0006_trip_history` and `0008_vehicle_image_upload` in the new migration before adding Producer columns; this prevents leaving two Alembic heads.
- API returns only aggregate counts, vehicle display fields needed for fleet/route reporting, and saved route metadata. It never returns owner names, emails, or account IDs.

## Frontend Design

- Add `/producer` and `/producer/profile` routes, protected by a client layout that resolves the current account and enforces the Producer role.
- Producer navigation includes only Dashboard and Profile. Direct visits to ordinary trip/garage pages redirect to `/producer`; ordinary user/admin navigation remains unchanged.
- Share Admin's persisted light/dark preference key and toggle component/hook. MUI palette values drive cards, borders, charts, text, tables, and status states.
- Dashboard uses responsive metric cards, a CSS donut for electric/combustion, an active/all-time fleet overview with timeline, most-used route summaries with per-vehicle rankings, and recent saved trips. No PDF button because no PDF feature exists.
- Loading, retryable safe error, no-vehicles/no-trips, and zero values are explicit and accessible.

## Project Structure

```text
backend/
  migrations/versions/0009_producer_dashboard.py
  src/data/models/vehicle.py
  src/vehicles/schemas.py
  src/vehicles/service.py
  src/trips/service.py
  src/producer/{__init__.py,dependencies.py,routes.py,schemas.py,service.py}
  src/main.py
  src/admin/routes.py
  tests/test_producer_dashboard.py
  tests/test_vehicle_brand_archive.py
frontend/
  src/app/producer/{layout.tsx,page.tsx,profile/page.tsx}
  src/components/{AppNavigation.tsx,DashboardThemeMode.tsx}
  src/features/producer/{components/,producerApi.ts,producerTypes.ts}
  src/features/vehicles/{vehiclesSlice.ts,validation.ts,components/VehicleForm.tsx}
  tests/producer-dashboard.spec.ts
specs/015-producer-dashboard/
  spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md
  contracts/producer-report.md
```

**Structure Decision**: Follow existing `backend/src/<feature>` and `frontend/src/features/<feature>` boundaries and existing Next.js App Router routes. Add only the cross-cutting files required for role-specific routing, shared theme preference, vehicle branding/archive, and reporting.

## Migration and Compatibility

The feature migration merges the two existing Alembic branches in one revision and adds only nullable fields/indexes, preserving old rows. Legacy unbranded vehicles are intentionally excluded until their owners add a brand. Existing trip records for an edited vehicle can be attributed via the retained vehicle row if they lack a snapshot brand. Physical deletions from before rollout cannot be recovered. Existing consumers still receive the established vehicle payload shape with the additive `brand` field; archived vehicles disappear from active garage/admin lists as before when they were deleted.

## Validation Plan

- Run Alembic history/heads and migration upgrade/downgrade checks against a disposable SQLite database.
- Run focused backend tests for the new report contract, authorization, brand normalization, metric math, route groups, archive behavior, and empty state; then run the existing backend suite.
- Run frontend type-check and focused Playwright Producer checks in light and dark modes, including role redirects, no data, retry/error, profile navigation, and no owner PII.
- Run existing vehicle and admin UI/API tests to confirm active-only compatibility.
- Inspect rendered dashboard at desktop and narrow viewport sizes.

## Complexity Tracking

No Constitution violations. The migration and vehicle deletion lifecycle changes are necessary to meet the explicitly approved brand and historical-fleet requirements while keeping existing owner-facing behavior.
