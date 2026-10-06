# Admin Dashboard Validation Quickstart

This guide describes the verification workflow after implementation. It uses the existing local SQLite/TestClient fixtures and does not require changes to a production database. Never put real account credentials in test fixtures or logs.

## Prerequisites

- Python 3.11–3.13 and backend development dependencies installed as described in [backend README](../../../backend/README.md).
- Node.js 20.9+ and frontend dependencies installed.
- For browser tests, the backend is available at the API base URL configured for the frontend, and the Playwright browser dependencies are installed.
- Backend tests use temporary SQLite databases. Do not point migration tests at a real or developer data store.

## Initialize Local Schema and First Admin

From `backend/`:

```powershell
python -m alembic upgrade heads
python scripts/create_admin.py
```

The provisioning command interactively requests the initial administrator's name, email, and password; the password is entered without echo. It creates the administrator only if the singleton slot is unoccupied. A second invocation must fail safely without creating or changing an account. This command is for a local development store configured by `DRIVE_WISE_DATABASE_URL`; do not use an application `.env` value that targets an unapproved shared/production database.

Start the backend using the existing [backend README](../../../backend/README.md) run command, then start the frontend from `frontend/`:

```powershell
npm run dev
```

Sign in as the provisioned administrator at `/login`. Public registration should still create only ordinary users. Producer accounts are created from the Producers section and should sign in with the email/password supplied at creation.

## Backend Verification

From `backend/`:

```powershell
python -m compileall src
python -m pytest
```

Expected coverage/outcomes:

1. Unauthenticated dashboard reads/mutations return safe 401 errors; user/producer roles return safe 403 errors; admin can access all sections.
2. Admin mutations require valid CSRF/origin checks. Invalid confirmation, malformed producer data, and unknown request fields do not change data.
3. User deactivation requires explicit confirmation, disables the account, revokes its sessions, denies later sign-in, and leaves its vehicle/favorite rows in place.
4. Producer creation validates required name, free-text brand, unique normalized email, and the existing password policy; duplicates return a safe conflict. The returned producer DTO contains no password or verifier, and login succeeds with its email/password.
5. Admin collections return only the selected page after applying filters and stable sorting. Pagination `total`/`total_pages` match filtered rows; global section statistics include all section rows and do not change with filters or page. Vehicle collection is all-owner and has no admin mutation route.
6. Invalid page values and page sizes above the API cap return safe validation errors; all matching records can be reached across pages; changing filters, sorting, or page size resets to the first page, and page navigation preserves active filters/sort.
7. Migration tests cover a fresh schema, one preexisting admin, zero admins, multiple preexisting admins (safe failure), legacy producers with null brand, and downgrade behavior.
8. Existing authentication, session, vehicle-ownership, trip, and health tests continue to pass.

## Frontend Verification

From `frontend/`:

```powershell
npm run type-check
npm run test:e2e
npm run build
```

Expected browser scenarios:

1. The isolated admin navigation exposes Overview, Users, Vehicles, and Producers without adding an Admin link to ordinary application navigation. Directly visiting an admin page redirects a signed-out user to `/login` and an authenticated non-admin to `/trip`.
2. Tables show loading, populated, empty, no-matching-results, and retryable error states distinctly. Filters and ascending/descending sorting work together with page navigation; changing a filter resets to page 1, moving pages preserves filters, page-size choices work, and clearing filters restores matching results without changing global statistics.
3. Canceling user deactivation preserves the row/status/counts; confirming deactivation updates the row to disabled and refreshes statistics. API failure leaves displayed data unchanged and provides retry feedback.
4. Producer form accepts valid data; missing or invalid values show English errors beside the corresponding fields; duplicate email is reported on Email. Unmapped errors use a safe form-level message. The password is never echoed in feedback, and successful creation refreshes the brand count.
5. The Overview charts reflect returned user status, vehicle type, and producer brand statistics. The light/dark preference persists when navigating admin routes and reloading.
6. All dashboard controls are keyboard operable with accessible labels/status announcements and remain usable at narrow viewport widths.

## API Contract Spot Checks

Use the existing cookie and CSRF client flow rather than sending credentials in URL parameters. For each endpoint in [admin-api.md](contracts/admin-api.md), confirm:

- success uses the `{ "data": ... }` envelope;
- errors use the shared safe `{ "error": ... }` envelope and expected status;
- admin endpoints reject all roles other than admin, irrespective of client navigation;
- no response includes password hashes, CSRF/session material, admin-slot internals, or vehicle owner IDs;
- `GET /health`, existing `/auth/*`, and user-owned `/vehicles/*` retain their established behavior.
