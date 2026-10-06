# Research: Admin Management Dashboard

**Status**: Updated against the implemented feature. Remaining browser verification is tracked in [tasks.md](tasks.md).

## Existing Project Findings

| Area | Existing behavior | Planning consequence |
|---|---|---|
| Backend | FastAPI app mounts `/auth`, `/vehicles`, and `/trips`; Pydantic 2 validates requests; SQLAlchemy sessions use the app engine; Alembic revisions currently end at `0004`. | Add a separate `/admin` router/module and a new migration only for required account attributes/invariants. |
| Authentication | `require_account` resolves the current active account from the secure-cookie server session. Login is email/password and works for any active account role. | Reuse the session dependency; producers need no separate login path. |
| Authorization | No admin-role dependency exists. `require_self` only enforces self-service ownership; trusted role change accepts the three known roles. | Add a server-side `require_admin` dependency and use it for every dashboard route. Frontend guards are supplemental. |
| Roles | Accounts allow `user`, `admin`, `producer`; public registration assigns `user`. There is no singleton-admin invariant or admin provisioning script. | Keep public registration unchanged; add a trusted first-admin script and enforce the singleton invariant in persistent storage and trusted role-change logic. |
| Account lifecycle | `DELETE /auth/me` checks current password and literal `DELETE`, sets status `disabled`, and revokes all account sessions. Disabled accounts cannot log in. | The admin operation should reuse disable/session-revocation behavior without requiring the target user's password. Do not physically delete the account. |
| Data relationships | Vehicles and trip favorites have account FKs with `ON DELETE CASCADE`; disabling an account does not trigger them. | Preserve product records when an account is deactivated; retain owning-feature data policies. |
| Accounts | `Account` has name, email, normalized email, password hash, role, status, and timestamps; normalized email is unique. No brand field exists. | Add a producer brand field; return only safe DTO fields from admin endpoints. |
| Vehicles | Fields include name, model, type, year, range/mileage in km, fuel type, and timestamps. Current `/vehicles` list is strictly owner-scoped. There is no make/brand field. | Add a dedicated all-vehicle admin read; keep the personal vehicle API and all vehicle mutations unchanged. |
| API conventions | HTTP/JSON, OpenAPI 3.1, `{data: ...}` success, common safe `{error: ...}` responses, 422 validation, generic safe 500. Mutations require CSRF and strict Origin checks. | New admin routes use the shared envelopes, schemas, and security dependencies. |
| Frontend | Next.js App Router, React/TypeScript, Redux Toolkit, MUI; `frontend/src/app/admin/layout.tsx` is a standalone admin shell and `apiRequest` handles credentials and CSRF. | Keep `/admin` outside `(account)` and shared `AppNavigation`; use the dedicated role-checked layout, Overview route, feature-local typed API, Redux state, and persistent admin theme choice. |
| UI states | Vehicle/trip screens use explicit loading, `role=status`, `role=alert`, retry, confirmation dialogs, and accessible labels. | Follow those patterns; use MUI Table and existing components because no Data Grid/table filter library exists. |
| Verification | Backend uses pytest/TestClient and temporary SQLite fixtures. Frontend has Playwright and `type-check`, `test:e2e`, `build` scripts. | Add focused API, migration, and E2E checks; no new test dependency. |

## Decisions

### Server-side authorization

**Decision**: Put an `require_admin` dependency in the admin feature boundary and attach it to all admin routes, requiring a current active session and `role == "admin"`. Mutations additionally use `require_csrf`.

**Rationale**: Existing `require_account` authenticates but does not authorize by role. The constitution requires backend enforcement on every protected data operation.

**Alternatives considered**: Hiding admin navigation only; relying on client route checks. Both allow direct API access and are rejected.

### Single administrator

**Decision**: Provision the first administrator with a separate Python command under `backend/scripts/`. Add a nullable unique administrator-slot value plus a role/slot consistency check to the account schema; update trusted role changes to reserve or clear the slot. The migration fails with explicit remediation if the existing store already has more than one administrator.

**Rationale**: A service-level count alone can race, while the project has no existing uniqueness constraint or provisioner. A nullable unique slot uses the existing Alembic/SQLAlchemy storage boundary and does not depend on a partial-index dialect feature.

**Alternatives considered**: A frontend-only restriction; a script-only count check; silently choosing/demoting one of multiple existing administrators. The first two do not enforce the invariant robustly; the last changes privileges without authorization.

### Producer brand persistence

**Decision**: Add nullable `brand` to `Account`, populate it for newly created producer accounts, and include it only in safe producer admin DTOs. Keep it null for user/admin records. Preserve legacy producers without a known brand and represent them as unassigned in the producer table/statistics.

**Rationale**: Producers are already represented as account roles, and the project has no separate producer profile entity or brand catalog. The brand is explicitly required by the clarified feature.

**Alternatives considered**: A new producer table/profile; deriving the brand from `name` or `email`; adding manufacturer to vehicles. None is supported by existing data or requested semantics.

### Admin account deletion

**Decision**: The dashboard's confirmed action deactivates ordinary-user accounts, revokes their active sessions, and preserves the account row and associated product data. The target user does not need to provide their password; server mutation still requires an explicit confirmation value and CSRF.

**Rationale**: Existing account deletion is a deactivation lifecycle and physical deletion could cascade-delete vehicles/favorites. The dashboard's confirmation authorizes the administrator action.

**Alternatives considered**: Hard delete/cascade; ask the administrator for the target user's password. Both conflict with established lifecycle or do not represent a reasonable administrator action.

### Tables, filters, sorting, and statistics

**Decision**: Return only the requested page and global section statistics together. Apply validated filters and sorting on the backend before page slicing; keep the selected filters/sort in page-local UI state and current rows/page metadata/statistics in Redux. Stats are user total/by status, vehicle total/by propulsion type, and producer total/by brand. Pagination defaults to page 1 and 25 rows; the UI offers 10/25/50 and the API caps page size at 100. `total`/`total_pages` describe filter-matching rows; global statistics do not change with active filters.

**Rationale**: The user explicitly requested pagination while loading records. Server-side slicing prevents the UI from downloading every record and works consistently with the existing FastAPI/SQLAlchemy boundary. Returning page rows and global aggregates together keeps the page and summary synchronized.

**Alternatives considered**: Client-side pagination after loading the full dataset would not reduce data transfer. Adding a data-grid dependency is unnecessary because MUI Table and accessible pagination controls are available. Use server-side pagination without a new dependency.

## Constraints and Remaining Assumptions

- The production database is not selected; development and automated tests use SQLite. The new migration and uniqueness design must be validated against the supported local SQLite version, and the production dialect must be reviewed when selected.
- Expected account and vehicle volume is not stated. Page size defaults to 25, the UI offers 10/25/50, and the API caps page size at 100 as an initial assumption.
- Filter matching follows field type (case-insensitive text search; exact enum values; inclusive numeric/date ranges). Exact filter widget and range affordances are UI implementation details to verify against the acceptance criteria.
- Producer brand has no existing length rule. The plan assumes a non-empty trimmed free-text value up to 120 characters, matching the current account-name convention; no brand catalog is introduced.
- A migration must not invent brand values for existing producer accounts. An unassigned-brand bucket is the default assumption until product data can be supplied.

