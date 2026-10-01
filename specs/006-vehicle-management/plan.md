# Implementation Plan: Vehicle Management

**Branch**: `006-vehicle-management` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Vehicle-management specification, completed requirements checklist, Drive Wise constitution, and approved designs from features 003–005.

## Summary

Add an authenticated, owner-scoped vehicle garage with list/create/read/update/delete operations and a responsive My vehicles page. Reuse the established FastAPI, Pydantic, SQLAlchemy/Alembic, Next.js, Redux Toolkit, and MUI foundations. The backend validates every write and derives ownership from the current session; the frontend uses the shared credentialed API client and keeps the vehicle collection in Redux. Add a shared authenticated navigation for the currently implemented app destinations (Profile and My vehicles), following the supplied garage screenshot's dark navy and cyan visual direction. Do not add trip-planning or trip-history pages, whose destinations do not exist yet.

## Technical Context

**Language/Version**: Python 3.11–3.13; TypeScript with Node.js 20.9+ and React 19.3.0.

**Primary Dependencies**: Retain FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, pytest 8.3.4, Next.js 16.3.7, Redux Toolkit 2.13.0, React Redux 9.3.0, MUI 9.4.0, TypeScript 5.9.3, and Playwright 1.56.1. No new dependency is required.

**Storage**: Existing SQLAlchemy/Alembic boundary. Add vehicle rows to the local/test SQLite schema; SQLite remains local/test only and no production database is selected.

**Testing**: Existing backend pytest and `python -m compileall src`; frontend `npm run type-check`, `npm run build`, and `npm run test:e2e`. Test scenarios are planned in [quickstart.md](quickstart.md); they are not run during planning.

**Target Platform**: Existing local contributor environment (Python 3.11–3.13, Node.js 20.9+); production deployment target remains unselected.

**Project Type**: Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: Meet spec SC-004: successful vehicle changes appear in the UI within 2 seconds under normal connectivity. No throughput target is introduced.

**Constraints**: Preserve `/health` exactly. Follow feature 004 HTTP/JSON, generated OpenAPI 3.1, `{data}` success and common safe `{error}` conventions. Require the existing session and CSRF protections for mutations. Enforce ownership in backend queries for every record-level operation. Use only approved stack and existing dependencies. Keep `/login` and `/register` outside authenticated navigation.

**Scale/Scope**: One garage per account, multiple vehicles per user without an imposed product cap; five API operations, one new protected page, shared navigation on authenticated pages, one vehicle data entity, and cross-layer validation/authorization coverage.

## Decisions

See [research.md](research.md) for rationale and alternatives. Product validation defaults are: name/model are trimmed and required (1–80 characters); type is `combustion` or `electric`; year is an integer from 1886 through the current calendar year; range and mileage are nonnegative whole kilometers; combustion vehicles require one of petrol, diesel, LPG, CNG, or other; electric vehicles have a null fuel type and display “Not applicable”. These values are owned by this feature and are not inferred from a technology choice.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Frontend owns navigation, forms, display, and client coordination. Backend owns validation, vehicle persistence, and ownership authorization through explicit contracts. | PASS |
| II. Compatible, Reusable Frontend | Reuse pinned React/TypeScript/Redux/MUI and current App Router patterns; use focused, typed feature components. No dependency changes. | PASS |
| III. One Authority for Shared Client State | Redux owns the shared vehicle list; component state is limited to transient form/dialog/loading interaction. No competing cached garage copies. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Document HTTP/JSON request, response, and error contracts. Derive owner from the authenticated account and scope every read/update/delete query to that owner. | PASS |
| V. Verified, Accessible User Outcomes | Plan API, authorization, persistence, browser flow, keyboard, responsive, empty/error-state coverage. Preserve accessible labels and active navigation semantics. | PASS |
| SDD development and review | This plan follows the spec; task generation and implementation must remain traceable to its contracts and verification scenarios. | PASS |

No gate violations or exceptions are proposed.

## Project Structure

### Documentation (this feature)

```text
specs/006-vehicle-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── vehicles-api.md
│   └── vehicles-ui.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.py                              # Mount vehicles router
│   ├── vehicles/
│   │   ├── routes.py                        # Authenticated collection/item operations
│   │   ├── schemas.py                       # Create, patch, and response models
│   │   └── service.py                       # Owner-scoped domain operations
│   ├── api/errors.py                        # Safe vehicle_not_found code mapping
│   └── data/models/
│       ├── vehicle.py                       # Vehicle persistence model
│       └── __init__.py                      # Register model for migration metadata
├── migrations/versions/0003_vehicles.py
└── tests/
    ├── test_vehicle_contracts.py
    ├── test_vehicle_authorization.py
    └── test_vehicle_persistence.py

frontend/
├── src/
│   ├── app/(account)/layout.tsx             # Shared authenticated navigation shell
│   ├── app/(account)/vehicles/page.tsx      # /vehicles page
│   ├── features/vehicles/
│   │   ├── vehiclesApi.ts
│   │   ├── vehiclesSlice.ts                 # Shared garage state in Redux
│   │   ├── validation.ts
│   │   └── components/VehicleManagementPage.tsx
│   ├── features/auth/components/ProfilePage.tsx # Reuses account layout without auth-nav duplication
│   └── components/AppNavigation.tsx
└── tests/vehicles-management.spec.ts        # Playwright user flows
```

**Structure Decision**: Extend the existing two-part web application. Follow feature-local backend and frontend modules, mount the API router in the existing app, and place both profile and vehicle routes under a shared authenticated route-group layout. Preserve URLs `/profile` and `/vehicles`; route-group layout is not part of the URL. The source paths are the planned target locations and may be refined during task breakdown without changing contracts.

## Post-Design Constitution Check

| Principle | Design evidence | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | [vehicles-api.md](contracts/vehicles-api.md) separates frontend operations from backend validation, persistence, and authorization; [vehicles-ui.md](contracts/vehicles-ui.md) defines presentation behavior. | PASS |
| II. Compatible, Reusable Frontend | Design uses existing MUI controls, Redux state, and shared App Router layout; adds no dependencies. | PASS |
| III. One Authority for Shared Client State | Redux is the collection authority; form values and dialog state are transient local state. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | API specifies authenticated operations, CSRF for writes, common envelopes, 422 validation, and indistinguishable 404 for absent/non-owned records. | PASS |
| V. Verified, Accessible User Outcomes | [quickstart.md](quickstart.md) lists backend, authorization, persistence, browser, accessibility, and responsive validation scenarios against measurable outcomes. | PASS |
| SDD development and review | The artifacts trace user stories and FRs through contracts and planned verification. | PASS |

No constitution exception is proposed.

## Complexity Tracking

No constitution violations or added dependencies are proposed.
