# Implementation Tasks: Admin Management Dashboard

Tasks reflect the delivered implementation in this repository. Backend authorization and endpoint behavior are authoritative; the dashboard uses the existing FastAPI, SQLAlchemy/Alembic, Next.js, Redux Toolkit, MUI, and cookie/CSRF conventions. Browser-level Playwright execution remains incomplete.

## Foundation

- [x] Add the `backend/src/admin` package, role guard, safe error mapping, and `/admin` router registration.
- [x] Add `brand` and the singleton `admin_slot` invariant to `Account`; create migration `0005_admin_dashboard` with safe existing-admin preflight/backfill and downgrade.
- [x] Keep trusted role changes consistent with the singleton admin slot and update admin test fixtures.
- [x] Add the separate interactive `backend/scripts/create_admin.py` provisioner using existing email/password validation and hashing.
- [x] Add shared pagination metadata, producer creation validation, and explicit user deactivation confirmation request models.

## Dashboard APIs

- [x] Add role-protected, filtered, sorted, paginated Users and Producers collections with global statistics.
- [x] Add confirmed user deactivation that disables the account and revokes sessions without deleting related records.
- [x] Add a paginated, all-owner, read-only Vehicles collection using existing vehicle fields and omitting owner IDs.
- [x] Add producer creation using email/password login, free-text brand, password hashing, normalized email uniqueness, and safe response fields.
- [x] Add backend tests for the role boundary, pagination, safe responses, producer login, CSRF, duplicate email, user deactivation/session revocation, vehicle privacy, and the singleton role change.

## Dashboard UI

- [x] Add the standalone `/admin` route tree and role-checked layout, separate from the ordinary application navigation.
- [x] Add Overview plus responsive Users, Vehicles, and Producers routes with active-link state.
- [x] Add the Overview summary cards and user-status, vehicle-type, and producer-brand charts using existing statistics responses.
- [x] Add the admin-only MUI light/dark switch and persist its choice in `drivewise-admin-theme` local storage.
- [x] Add typed dashboard API calls, Redux collection/request state, and collection reset on `authCleared`.
- [x] Add global statistic cards, combined server-side filters/sorting/pagination, and loading, empty, no-match, retryable error, and success states.
- [x] Add user deactivation confirmation and producer creation dialog, opened by Add producer, without exposing credentials in tables or messages.
- [ ] Mirror producer name/brand, email, and password rules in frontend validation; map safe backend field locations and duplicate-email errors to English field-level feedback, with a safe form-level fallback for unmapped errors.
- [x] Keep admin interface text in English and the producer fields hidden until the creation dialog is opened.
- [x] Route admin sign-out to `/`; successful admin login routes to `/admin`.
- [ ] Complete Playwright execution and broaden browser scenarios across field-level validation, duplicate email, cancellation/failure, pagination/filter combinations, and narrow-screen behavior.

## Verification

- [x] Run backend compilation and the dashboard/auth/vehicle/health regression tests.
- [x] Run the backend suite excluding live-trip integration modules that require configured `TRIP_TEST_*` values.
- [x] Run Alembic upgrade, downgrade, and re-upgrade against a disposable SQLite database.
- [x] Run frontend type-check and production build.
- [ ] Run and pass the dashboard Playwright suite in the local browser environment.
- [x] Add automated migration tests for fresh schema, legacy account/vehicle/favorite data, a single admin, and safe failure with multiple preexisting administrators.
- [ ] Verify live-trip tests with their required `TRIP_TEST_*` configuration.
- [x] Update backend setup documentation and review dashboard outputs for secrets, internal admin slots, owner IDs, and unsupported write operations.

