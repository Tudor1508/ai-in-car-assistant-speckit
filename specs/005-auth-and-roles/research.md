# Research: Authentication and Roles

**Status**: D1 through D7 approved by the owner. Options are retained below for decision history; selected choices are recorded in [Approved Owner Decisions](#approved-owner-decisions).

## Repository Context

- `003-backend-setup/plan.md` approves Python 3.11–3.13, FastAPI 0.115.6, Uvicorn 0.34.0, pip, pytest 8.3.4, and a backend under `backend/src/`.
- `004-api-and-data-foundation/plan.md` and contracts approve HTTP/JSON, FastAPI-generated OpenAPI 3.1, Pydantic 2.13.5, safe `{data}`/`{error}` envelopes, HTTP 422 for invalid input, generic 500 errors, common 404/405, SQLAlchemy 2.0.54, Alembic 1.20.0, and SQLite for local/test only. No production database was selected.
- Backend currently has only `/health`, shared response/error helpers, and database/session factory. There are no account/session tables or auth routes.
- Frontend is Next.js 16.3.7 App Router, React 19.3.0, TypeScript 5.9.3, Redux Toolkit 2.13.0 and MUI 9.4.0. It has only a skeleton page/store and has no behavioral test runner in `package.json`.
- The supplied legacy screenshots show email/password sign-in; name/email/password/confirmation registration with a password-rules hint; and a profile with role label, edit, password change, account deletion, and logout. These are visual context only except where owner-confirmed behaviors have been added to `spec.md`.
- The old README's JWT and Argon2 references were not treated as approvals. The password composition rule and the broad session/account flows were approved through the clarification record in `spec.md`.

## Approved Owner Decisions

The owner approved `D1:A, D2:A, D3:A, D4:B, D5:A, D6:A, D7:A` before authorizing implementation. Approved dependencies are installed and used by the completed implementation.

| ID | Approved choice | Recorded implementation value |
|---|---|---|
| D1 | A | 30-minute idle and 8-hour absolute server-side session expiry; logout ends current session; password change and account deactivation revoke all sessions. |
| D2 | A | Host-only `__Host-dw_session`; Secure, HttpOnly, SameSite=Lax, Path=/, no Domain; synchronizer token and strict Origin/Referer checks; exact-origin credentialed CORS. |
| D3 | A | Argon2id with m=19 MiB minimum, t=2, p=1, unique salt; direct Python dependency pin `argon2-cffi==25.1.0`. |
| D4 | B | Preserve entered email spelling; trim and compare case-insensitively for uniqueness/sign-in; do not verify mailbox ownership or integrate email in 005; email changes remain unverified. |
| D5 | A | Revoke every active session when trusted provisioning changes a role; new role takes effect at next sign-in. |
| D6 | A | `@playwright/test==1.56.1` for browser E2E tests; retain existing pytest for backend checks. |
| D7 | A | Persist anonymous CSRF bootstrap state in a separate `AnonymousCsrfContext` entity. Identify it with the approved `__Host-dw_session` cookie, use 30-minute idle/8-hour absolute expiry, revoke it on successful login, and issue a new authenticated session identifier and session-bound CSRF token. |

### Dependency compatibility evidence

- `argon2-cffi==25.1.0` is a stable PyPI release. PyPI metadata declares `Requires-Python >=3.8` and classifiers for Python 3.11, 3.12, and 3.13, matching the 003 runtime range. It declares `argon2-cffi-bindings` as a transitive dependency; pip will resolve that dependency during a later install. No package was installed or executed in this planning turn. [PyPI release metadata](https://pypi.org/project/argon2-cffi/25.1.0/)
- `@playwright/test==1.56.1` is a stable Playwright release. Its upstream package manifest declares Node.js `>=18`, compatible with the repository?s `>=20.9.0` engine, and pins its `playwright` dependency to `1.56.1`. This stable release is selected to fit the existing Node baseline; current Playwright installation documentation recommends Node 22/24/26, which would require raising the project baseline to use the current release. No package or browser was installed or executed. [Playwright 1.56.1 package manifest](https://github.com/microsoft/playwright/blob/v1.56.1/packages/playwright-test/package.json), [current Playwright system requirements](https://playwright.dev/docs/intro#system-requirements)

No approval remains outstanding for D1 through D7 or their exact direct dependency pins. D7:A selects a separate anonymous CSRF context, uses the approved `__Host-dw_session` cookie, applies D1 idle/absolute expiry, and revokes/rotates the anonymous context and cookie at login. A production database, email delivery, and deployment-specific origins remain outside this feature.

## Decision alternatives (for audit trail)

The options below explain the alternatives considered. They are not active approval requests; the selected option is listed above.

### D1 — Session expiry and invalidation

| Option | Behavior | Implications |
|---|---|---|
| A (recommended) | Server-enforced 30-minute idle timeout and 8-hour absolute lifetime. Logout invalidates the current session. Password change revokes all sessions and requires sign-in again. Account deletion revokes all sessions. | Balances a typical low-risk web workflow with bounded exposure. OWASP recommends both idle and absolute timeouts and gives 15–30 minutes as a common low-risk idle range; the 8-hour absolute limit is a project proposal, not an OWASP-mandated value. Password-change reauthentication is more disruptive but limits stale access. |
| B | Server-enforced 15-minute idle timeout and 4-hour absolute lifetime; same invalidation rules as A. | Shorter exposure window; users reauthenticate more often. |
| C | Owner supplies the idle timeout, absolute timeout, and password-change session behavior. | Allows a different security/usability balance; all values must be explicit before implementation. |

Session expiry must be checked server-side, not trusted to a client timer. Existing spec behavior already requires logout to invalidate the current session and deletion to invalidate all sessions.

### D2 — Cookie attributes and CSRF protection

| Option | Behavior | Implications |
|---|---|---|
| A (recommended) | Host-only `__Host-dw_session` cookie; `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`; synchronizer CSRF token on state-changing requests plus strict Origin/Referer validation; exact-origin CORS with credentials. | Protects the session ID from JavaScript and cross-site cookie transport, limits sibling-domain scope, and adds explicit CSRF defense. Requires a CSRF-token bootstrap/response contract and local browser tests over a secure context. |
| B | Same cookie constraints, but `SameSite=Strict` and synchronizer token + Origin validation. | Stronger cross-site restriction; may interrupt sign-in continuity when a user follows an external link into Drive Wise. |
| C | `SameSite=Lax` and strict Origin/Fetch-Metadata checks, without a CSRF token. | Fewer moving parts, but relies more heavily on origin checks and deployment/browser assumptions; not preferred for a cookie-authenticated API. |

The approved cookie name, flags, CSRF token, and exact-origin CORS policy are D2:A. Wildcard CORS with credentials is excluded. State-changing operations must never use GET. `Secure` means browser validation requires HTTPS or a supported secure localhost/test setup.

### D3 — Password hashing algorithm and parameters

| Option | Proposed verifier | Implications |
|---|---|---|
| A (recommended) | Argon2id, minimum 19 MiB memory, 2 iterations, parallelism 1, unique per-password salt; benchmark on the supported runtime and raise cost if practical. | OWASP's current Password Storage guidance recommends these minimum Argon2id settings. Requires the approved pinned runtime dependency `argon2-cffi==25.1.0`. |
| B | scrypt with `N=2^17`, `r=8`, `p=1`, unique salt. | OWASP recommends these minimum values when Argon2id is unavailable. Python's standard library has scrypt support on supported builds, but deployment/runtime compatibility and cost still need verification. |
| C | PBKDF2-HMAC-SHA256 with at least 600,000 iterations and a unique salt. | OWASP lists this path when FIPS-140 compliance is required; no FIPS requirement is currently known. |

Plaintext storage, reversible password encryption, and fast general-purpose hashes are not options. D3:A is owner-approved; the selected pin and settings are in the decision table above.

**Password-rule risk**: The owner-approved minimum of 8 characters is below OWASP Authentication guidance's stated 15-character minimum for password-only authentication when MFA is not enabled. This plan does not override the clarified spec or add MFA. The owner should consider revising the password rule through specification clarification before implementation if the current rule is not acceptable.

### D4 — Email identity normalization and ownership verification

| Option | Behavior | Implications |
|---|---|---|
| A | Preserve the entered address for display; compare trimmed addresses case-insensitively for identity; require one-time email verification before activation. Do not select a provider here. | OWASP recommends verified email before enabling an email-identified account. Case-insensitive matching is simple for sign-in but can merge technically case-sensitive local-part variants; owner approval makes that identity policy explicit. Requires a separately approved delivery service, secrets/configuration, pending-account behavior, token expiry, and failure UX. |
| B (recommended if scope stays unchanged) | Preserve the entered address for display; use the same trimmed, case-insensitive unique sign-in comparison, but do not verify mailbox ownership in 005. Require current-password proof for an email change; show it as unverified. | Adds no external dependency and keeps the feature self-contained, but a mistyped or another person's address is not verified and case-sensitive local-part variants share one account identity. Future features must not rely on mailbox ownership. This does not meet OWASP's verified-email recommendation and must be recorded as a scoped limitation. |
| C | Owner specifies a different comparison/normalization policy and whether/how an operator verifies address ownership outside the public application. | Preserves an alternate identity policy, but requires exact rules for uniqueness and verification before schema/API work. |

D4:B is approved; this feature does not configure or call an email service.

**Approved selection**: D4:B. No email delivery is included; email remains an unverified sign-in identifier.

### D5 — Effect of role changes on active sessions

| Option | Behavior | Implications |
|---|---|---|
| A (recommended) | When trusted provisioning changes a role, revoke every active session for that account; the person signs in again and receives the new role. | Simple, fail-closed behavior for both promotions and demotions. Causes a one-time sign-in interruption. |
| B | Apply the current database role on the next request, rotate session identifiers for every active session, and invalidate prior IDs. | Changes permissions immediately without requiring a new sign-in; needs session-wide rotation coordination and testing. |
| C | Keep the old role in active sessions until they expire naturally. | Less disruptive but delays demotions and can retain removed privileges; not recommended. |

No role-grant route or admin screen is created. The trusted provisioning operation itself remains outside this feature.

### D6 — Frontend behavior and cross-layer test runner

| Option | Coverage | Implications |
|---|---|---|
| A (recommended) | Add Playwright browser tests that drive Next.js against the local FastAPI service and isolated SQLite database. | Verifies real form interactions, cookies/CSRF, own-account boundaries, logout, password change and deletion across the frontend/backend boundary. Adds a frontend dev dependency and browser setup; neither is currently present. |
| B | Add Vitest and React Testing Library for components, plus existing pytest for backend API behavior. | Good component-level feedback but does not prove actual browser cookie/CORS behavior across the frontend/backend boundary without extra integration work. Adds frontend test dependencies. |
| C | Keep only existing type-check/build and use a manual walkthrough. | No dependency cost, but does not meet the constitution's expectation for tested user flows and cross-layer behavior; not recommended for acceptance. |

Playwright 1.56.1 is approved and installed for cross-layer browser coverage. The browser setup and feature journeys were exercised during implementation.

### D7 — Anonymous CSRF bootstrap persistence and login rotation

| Option | Persistence and lifecycle | Implications |
|---|---|---|
| A (approved) | Persist anonymous bootstrap state in a separate `AnonymousCsrfContext` entity, identified by the approved `__Host-dw_session` cookie. Apply D1's 30-minute idle/8-hour absolute expiry. At login, revoke the anonymous context, rotate the cookie identifier, and issue a new authenticated session identifier and session-bound CSRF token. | Keeps anonymous CSRF state distinct from authenticated sessions and prevents it from granting account access. Adds a separate persistence entity and migration. |
| B | Store pre-auth state in `AuthSession` as a distinct state/type, with an absent account reference until login; replace it with a new authenticated session on successful login. | Reuses one table and expiry machinery, but mixes anonymous and authenticated lifecycles, requires nullable account linkage and strict type checks on every protected route. Not selected. |

The owner approved D7:A and separately confirmed reuse of the approved cookie name/attributes and identifier/token rotation on login.

## Comparison Notes and Sources

- OWASP's [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) recommends secure, HttpOnly cookies, explicit SameSite policy, server-side idle and absolute timeouts, active server invalidation on logout/expiry, and session-ID regeneration after authentication/privilege changes. It describes 15–30 minutes as a common idle range for low-risk applications. It does not prescribe this product's absolute lifetime.
- OWASP's [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) treats SameSite as defense in depth and recommends a CSRF token or double-submit approach where the deployment assumptions for SameSite-only protection are not all met; it also documents Origin/Referer validation.
- OWASP's [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) recommends Argon2id with at least 19 MiB, two iterations and parallelism one; it lists scrypt and PBKDF2 alternatives and rejects plaintext/fast hashes.
- OWASP's [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) notes email-as-username should be verified at sign-up and recommends against composition rules. The owner's previously approved legacy composition rule remains unchanged in this spec; changing it requires a separate spec clarification.
- OWASP's [Email Validation and Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html) recommends defining email normalization and verifying ownership before enabling account use; the email policy options expose the service/scope consequence.
- Playwright's [browser testing documentation](https://playwright.dev/docs/browsers) describes real-browser end-to-end testing and its browser-installation requirements; this supports D6's cross-layer coverage tradeoff.

## Other Decisions Already Resolved

- Reuse the exact direct dependencies and API/data contracts approved in 003/004; do not migrate frameworks or add a second persistence abstraction.
- Store authentication data through the 004 SQLAlchemy/Alembic boundary. SQLite is for local development/tests only; production persistence remains unselected and is not a deployment guarantee.
- Keep `GET /health` unchanged. No product endpoint beyond authentication/self-profile, no role-management endpoint, and no external integration is included.
- Use backend tests against isolated temporary stores; never run auth tests against a contributor's default SQLite file.
