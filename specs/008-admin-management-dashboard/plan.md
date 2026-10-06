# Implementation Plan: Admin Management Dashboard

**Branch**: `008-admin-management-dashboard` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Clarified admin-dashboard requirements, existing project architecture, and the Drive Wise constitution.

## Summary

The implemented admin area is a standalone `/admin` route tree with Overview, Users, Vehicles, and Producers. It reuses the existing FastAPI session, email/password, CSRF, safe API envelope, SQLAlchemy/Alembic, Next.js App Router, Redux Toolkit, MUI, and Playwright patterns. Every dashboard endpoint checks the current account's `admin` role on the backend. Public registration continues to create ordinary users; one administrator is provisioned through a separate trusted backend script; that administrator can provision producers using name, free-text brand, email, and the existing password policy. User deactivation uses the existing disabled-account lifecycle and revokes sessions. Vehicles remain read-only. The admin layout owns navigation and a persistent light/dark preference. Overview charts use the existing statistics responses without a chart dependency.

## Technical Context

**Language/Version**: Python 3.11â€“3.13; TypeScript; Node.js 20.9+.

**Primary Dependencies**: Existing FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, pytest 8.3.4, Next.js 16.3.7, React 19.3.0, Redux Toolkit 2.13.0, MUI 9.4.0, TypeScript 5.9.3, and Playwright 1.56.1. No dependency change is planned.

**Storage**: Existing SQLAlchemy/Alembic boundary and SQLite local/test database. Production database remains unselected. Add producer brand and a database-enforced singleton administrator slot to account storage; no vehicle schema change.

**Testing**: Backend `python -m pytest` and `python -m compileall src`; frontend `npm run type-check`, `npm run test:e2e`, and `npm run build` from `frontend/`. New backend coverage uses the existing temporary SQLite/TestClient fixtures; browser coverage uses Playwright.

**Target Platform**: Existing browser-based Next.js application and FastAPI service; no new deployment target.

**Project Type**: Web application with separate frontend and backend projects.

**Performance Goals**: No product latency or throughput target is specified. Each collection request returns no more than 100 rows; the UI initially requests 25 rows. Global statistics are aggregated separately from page retrieval.

**Constraints**: Keep HTTP/JSON and FastAPI-generated OpenAPI 3.1; success `{ "data": ... }`; safe error `{ "error": { "code", "message", "details?", "request_id?" } }`; Pydantic validation; cookie-session authentication; existing CSRF and exact-origin protections for mutations. Do not change `/health` or existing owner-scoped vehicle operations. Do not add dependencies.

**Scale/Scope**: One admin dashboard with Overview and three sections; account listing/deactivation, producer provisioning, and read-only all-vehicle listing. All three section APIs use server-side pagination, filtering, and sorting; no total record-volume ceiling is defined.

## Constitution Check

*GATE: PASS after design review. No constitution exception is proposed; assumptions below are explicit and do not block the design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Next.js owns dashboard presentation and transient interaction; FastAPI owns data, validation, authentication, and authorization. Cross-layer operations have explicit contracts. | PASS |
| II. Compatible, Reusable Frontend | Use the pinned Next.js/React/TypeScript/Redux/MUI stack and existing accessible form/dialog/navigation patterns; add no UI dependency. | PASS |
| III. One Authority for Shared Client State | Store the current page, pagination metadata, global statistics, and request state in feature Redux slices; keep filter text, sort selection, and dialog state local. Clear protected collections on `authCleared`. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Document request/response/error shapes; validate at Pydantic boundaries; require an active admin session on every dashboard operation. Frontend route checks remain supplementary only. | PASS |
| V. Verified, Accessible User Outcomes | Add role-matrix API tests, validation/lifecycle tests, migration tests, and Playwright coverage for page access, filtering/sorting, forms, confirmation, messages, responsive layout, and keyboard use. | PASS |
| Technology Constraints and Open Decisions | Reuse established dependencies and local persistence. Production database is not selected; the singleton-admin slot uses standard nullable unique/check constraints in the existing migration path. | PASS; local storage boundary known |
| SDD Development and Review | This plan and contracts precede task generation. Tests cover both backend authorization and cross-layer behavior. | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-management-dashboard/
â”œâ”€â”€ plan.md
â”œâ”€â”€ research.md
â”œâ”€â”€ data-model.md
â”œâ”€â”€ quickstart.md
â””â”€â”€ contracts/
    â”œâ”€â”€ admin-api.md
    â””â”€â”€ admin-ui.md
```

### Source Code (repository root)

```text
backend/
|-- scripts/create_admin.py
|-- src/admin/                          # admin dependencies, schemas, routes
|-- src/data/models/account.py
|-- migrations/versions/0005_admin_dashboard.py
|-- tests/test_admin_dashboard.py
|-- tests/test_admin_migration.py

frontend/src/
|-- app/admin/
|   |-- layout.tsx                      # role gate, standalone navigation, theme, sign-out
|   |-- page.tsx                        # Overview and statistics charts
|   |-- users/page.tsx
|   |-- vehicles/page.tsx
|   |-- producers/page.tsx
|-- app/page.tsx                        # public landing (separate feature)
|-- features/admin/
|   |-- adminApi.ts
|   |-- adminSlice.ts
|   |-- components/AdminSection.tsx
|-- features/landing/LandingPage.tsx

frontend/tests/admin-dashboard.spec.ts
```

**Structure Decision**: Follow the established feature-module structure. Add a backend `admin` feature package instead of expanding self-service `/auth/me` or owner-scoped `/vehicles` routes. Keep `/admin` outside the `(account)` route group: `frontend/src/app/admin/layout.tsx` provides its own role check, navigation, MUI theme, and sign-out. `frontend/src/app/admin/page.tsx` is Overview, with child routes for Users, Vehicles, and Producers. Ordinary application navigation remains separate. The existing `backend/scripts/` directory holds the separate Python administrator provisioning command.

## Architecture and Ownership

```text
Browser / Next.js App Router
  standalone /admin layout (role gate, Overview | Users | Vehicles | Producers)
  admin-only MUI light/dark preference (localStorage)
  Overview charts from existing section statistics
  feature API + Redux collections/status
  current page + pagination/statistics in Redux
  transient filters/sort/dialog state in components
             â”‚ credentialed HTTP/JSON + CSRF on mutations
             â–¼
FastAPI admin router
  require_account -> require_admin on every operation
  Pydantic request/query validation -> safe shared errors
  SQLAlchemy services -> account/vehicle records and aggregates
             â”‚
             â–¼
SQLAlchemy/Alembic local/test store
  accounts (brand + unique singleton admin slot)
  vehicles (existing schema, read-only here)
```

Backend route authorization is authoritative. The admin layout reads `/auth/me`; an unauthenticated visitor is sent to `/login` and an authenticated non-admin is sent to `/trip`. A direct API request is still denied by `require_admin`. Successful sign-out from the admin layout returns to `/`.

The dashboard must not expose password hashes, session IDs, CSRF token verifiers, or vehicle owner identifiers. The producer create API hashes the submitted password through `src.auth.passwords.hash_password`; producers use existing email/password login without changing login behavior.

## API and Data Design

See [Admin API Contract](contracts/admin-api.md) and [Data Model](data-model.md). Add admin endpoints under `/admin`; all successful responses follow the shared `{ "data": ... }` envelope. The API client continues to use `apiRequest`, which sends credentials, bootstraps CSRF, and attaches the token to unsafe requests.

Collections include section statistics in the same response so each screen can refresh rows and totals together. Requests include a one-based `page` and bounded `page_size`, supported section filters, and whitelisted `sort_by`/`sort_order`. The backend applies filters and sorting before slicing the requested page. Response pagination metadata contains `page`, `page_size`, `total` matching filtered rows, and `total_pages`. Global section statistics (including section total and role/status/type/brand breakdowns) remain independent of current filters and page. The initial page size is 25; the UI offers 10, 25, and 50 rows per page, while the API caps requests at 100.

For users, list only role `user` accounts, including disabled rows so status statistics and lifecycle remain visible; provide counts by active/disabled. Admins cannot manage admin accounts or producers from Users. Producer rows are role `producer` and support name, email, brand, status, and creation-date filtering/sorting; producer stats group by brand. Vehicle rows use the existing fields and are read-only; stats group by `type`. Never use the personal vehicle endpoint for this view because it scopes results to the current owner's account.

Admin user deactivation is a confirmed `DELETE /admin/users/{account_id}` operation whose request includes the existing literal `confirmation: "DELETE"`; it does not require the target user's password. The service uses the existing disabled status and session-revocation helpers, while avoiding physical deletion and its foreign-key cascades. The operation accepts only ordinary users. It returns the shared status shape and the UI refreshes the account list/statistics.

Producer create validation reuses `valid_email`, `valid_password`, normalized email uniqueness, and Argon2 hashing. Name validation follows the current 1â€“120 character account rule; brand is required trimmed free text. Email conflict returns HTTP 409 with the safe `email_unavailable` code. A successful account has `role="producer"`, active status, and the existing email/password login flow.

## Persistence and Singleton Administrator

Add a nullable `brand` field to `Account`, used only for producer profile data. New producer creation requires trimmed free text of at most 120 characters, as implemented in the API schema and account model. Existing producers without a brand retain a null value; statistics and the overview chart display that group as `No brand`. No producer editing operation exists.

Enforce one administrator across active and disabled accounts using an `admin_slot` nullable column with a unique constraint and a check constraint tying the fixed singleton value to the `admin` role. Non-admin accounts have a null slot; an admin row has the fixed value. Update the trusted role-change helper so it maintains the slot and rejects a second admin. The separate `backend/scripts/create_admin.py` command checks for an existing admin, creates the first one with the existing validation/hash/session model, and fails clearly if the slot is already occupied. The migration assigns the singleton slot if one existing admin row is present and aborts with remediation guidance if existing data contains multiple admin accounts; it must not choose one or demote accounts silently.

No vehicle migration is required. No physical account deletion occurs, so account foreign-key cascade behavior for vehicles and trip favorites remains dormant; product records stay subject to the owning features' policies.

## Frontend Design

- Keep the dashboard at `/admin`, outside the `(account)` route group and shared application navigation. Its own layout checks the current role and renders Overview, Users, Vehicles, and Producers navigation with `aria-current`.
- Overview at `/admin` loads the existing collection/statistics API for each section and displays totals, user status and vehicle type donut summaries, and a producer brand chart. It adds no chart dependency.
- The admin layout uses MUI `ThemeProvider` and a light/dark icon button. It stores the mode in `localStorage` under `drivewise-admin-theme`; this preference applies within admin routes.
- Add admin API/types and a Redux slice with collections, summary statistics, and `idle | loading | succeeded | failed` states. Reset the slice on `authCleared`.
- Use MUI `Table`, form controls, `Alert`, and `Dialog`; no Data Grid dependency exists. Follow the vehicle form, delete dialog, and navigation patterns for labels, focus, responsive layout, retry, and server validation.
- The Producers form is a dialog opened by Add producer; its fields are not rendered in the page until opened. Admin UI labels and messages are English.
- Keep filter/sort selections and open-dialog/form state local to the relevant page. Send filters, sort, page, and page size to the API; store only the current page, pagination metadata, and global statistics in Redux. Reset to page 1 when filters, sort, or page size changes. Refetch after producer creation or user deactivation so totals and rows stay authoritative.
- For a missing session, clear auth state and route to `/login`; for an authenticated non-admin, route to the existing `/trip` application page. Backend API calls still return 401/403 and disclose no dashboard records.
- Loading uses an accessible status, no records and no filter matches have distinct empty states, and read errors offer retry. Mutation failures keep the form/dialog and entered fields available; passwords remain masked in the open form and are never echoed in errors. A successful producer submission resets the form. Success uses accessible status feedback.

## Error Handling and Validation

- Continue using `SuccessEnvelope`, `common_error_responses`, and the installed safe error handlers. Add explicit safe codes for role denial and deactivation-not-allowed/not-found as needed; never return SQL, validation input, or exception detail.
- Every read/write endpoint depends on an active `require_account` session followed by a role check. Every POST/DELETE also uses existing `require_csrf` and strict Origin validation.
- Pydantic models reject unknown fields and validate account/brand/password values at the backend boundary. Frontend validation mirrors the implemented rules for required trimmed name and brand (1–120 characters), email format, and password (at least 8 characters with an uppercase letter, a number, and a special character); backend validation remains authoritative.
- Show actionable English field-level errors beside invalid producer inputs. Map safe backend validation `details[].location` to the corresponding input and map `email_unavailable` to Email. Use a safe form-level fallback if an error cannot be mapped; never display raw server details. Distinguish API failure from an empty collection. The UI provides retry for recoverable reads, a confirmation dialog before user deactivation, and success feedback after mutations.

## Verification Strategy

Use existing test runners and temporary fixtures. See [quickstart.md](quickstart.md) for commands and expected outcomes.

1. Backend authorization matrix: unauthenticated, `user`, and `producer` receive no dashboard data; `admin` can read all three sections; every mutation rejects non-admin and invalid CSRF/origin.
2. Account and producer tests: Users includes only `user` role; admin deactivation requires literal confirmation, disables, revokes sessions, and preserves account-owned product rows; producer validation checks required name/brand/email/password, password rule, duplicate normalized email (including concurrent uniqueness), role assignment, no secret response, and subsequent email/password login. Update admin-account test factories/fixtures to populate the singleton slot.
3. Admin singleton tests: provisioning succeeds once; a second admin creation/promotion fails; migration handles zero/one existing admin and fails safely on multiple existing admins.
4. Vehicle and statistic tests: paged vehicle results cover all owners without exposing owner IDs; no write route is exposed; filters/sorting happen before page slicing; global counts cover every status/type/brand and refresh following mutations.
5. Frontend/API tests: isolated admin navigation and route guard, Overview statistics/charts, theme persistence across admin navigation/reload, combined filters and sorting, clear-filter/no-match states, loading and retryable errors, producer dialog success/422/409 field-level error states, and confirmed/cancelled user deactivation.
6. Accessibility/responsive checks: labels, keyboard navigation/dialog focus, status/alert announcements, and supported narrow/wide viewports.
7. Regression verification: keep existing auth, vehicle ownership, registration, session, trip, and `/health` tests passing; run backend compile/pytest and frontend type-check, E2E, and build commands.

## Assumptions and Review Points

### Assumptions for this plan

- Dashboard breakdown statistics are global and independent of table filters. The filtered `total` and `total_pages` reflect the current filters; page items are returned after server-side filter/sort.
- Page size defaults to 25; users may choose 10, 25, or 50 rows, and the API enforces a maximum of 100 rows per request. These are initial usability/performance defaults and can be adjusted without changing the data model.
- Existing producer rows may predate the brand field; migration preserves a null brand, and the UI/statistics label that group "No brand".
- Filter semantics follow simple field filtering: case-insensitive contains for text, exact values for enums, and inclusive ranges for dates/numbers; changing filters or sort returns the user to page 1.
- Producer brand is required trimmed text of at most 120 characters, as implemented in the producer request schema and account model.
- No producer delete/edit workflow is added because the approved scope only grants producer creation and review. Brand editing can be designed in a separate feature if required.
- Migration preflight stops rather than choosing between multiple existing admin accounts. An operator must resolve that condition before applying the migration.



## Complexity Tracking

No constitution exception is proposed. The admin slot column and producer brand field are small schema additions required by the approved singleton-admin and producer-brand requirements. They do not add a new dependency or alter vehicle ownership semantics.









