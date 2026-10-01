---
description: "Dependency-ordered implementation tasks for authentication and roles"
---

# Tasks: Authentication and Roles

**Input**: Approved `specs/005-auth-and-roles/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/`.

**Prerequisites**: Features 003 and 004; all owner decisions D1–D7 are approved. Use only `argon2-cffi==25.1.0` and `@playwright/test==1.56.1` for the approved additions. Do not add email delivery, another authentication or test framework, production database support, or product features.

**Tests**: Backend contract/authorization tests and Playwright browser tests are required by the feature and constitution. Write the story-specific tests before their implementation tasks; run them after implementation and in the final verification phase.

**Organization**: Tasks are grouped by the user stories in `spec.md`. IDs indicate dependency order; `[P]` marks work in distinct files that can proceed in parallel once its listed prerequisites are met.

## Phase 1: Setup

**Purpose**: Declare only the owner-approved dependencies and browser-test setup.

- [x] T001 [P] Add `argon2-cffi==25.1.0` to `backend/requirements.txt`; preserve all existing 003/004 pins (FR-017; SC-006).
- [x] T002 [P] Add `@playwright/test==1.56.1` to `frontend/package.json`, update `frontend/package-lock.json` with no unrelated dependency upgrades, and add the `test:e2e` script (FR-013, FR-017; SC-007).
- [x] T003 Configure `frontend/playwright.config.ts` for the local frontend/backend origins, secure-cookie browser context, and the existing test file layout; do not weaken `Secure`, `HttpOnly`, `SameSite=Lax`, or exact-origin CORS behavior (FR-004, FR-017; SC-002, SC-007).

---

## Phase 2: Foundational

**Purpose**: Complete contract detail, persistence, configuration, password verification, and reusable session/CSRF boundaries required by every story.

- [x] T004 Finalize `specs/005-auth-and-roles/contracts/auth-api.md` with the D2 synchronizer-token bootstrap/submission contract for anonymous and authenticated states: `POST /auth/csrf/bootstrap`, JSON response token, `X-CSRF-Token` request header, strict Origin/Referer checks, anonymous context replacement, D1-aligned expiry, login cookie/token rotation, and safe errors; retain approved cookie flags, exact-origin CORS, and 004 envelopes (FR-004, FR-010, FR-017; SC-002, SC-006).
- [x] T005 [P] Write persistence tests in `backend/tests/test_auth_persistence.py` using temporary SQLite for Account, AuthSession, and separate AnonymousCsrfContext; cover fields, constraints, disabled-account state, uniqueness, context expiry/revocation/replacement, and migration upgrade/downgrade (FR-011, FR-012, FR-017; SC-002, SC-005, SC-006).
- [x] T006 Implement Account, AuthSession, and separate AnonymousCsrfContext SQLAlchemy models in `backend/src/data/models/account.py`, `backend/src/data/models/auth_session.py`, and `backend/src/data/models/anonymous_csrf_context.py`. Follow `data-model.md`: unique opaque account ID; required validated name; role limited to `user/admin/producer`; status `active/disabled`; public registration assigns `user`; D4:B display spelling and trimmed/case-insensitive identity comparison; unverified email without verification-state persistence; one-way password verifier and session-ID digest only; session/account foreign key; bootstrap identifier digest and CSRF verifier; server timestamps and D1 idle/absolute expiry (FR-011, FR-012, FR-015, FR-017; SC-001, SC-002, SC-004, SC-005, SC-006).
- [x] T007 After T005/T006, add the account/session/anonymous-CSRF-context Alembic revision in `backend/migrations/versions/0002_auth_accounts_sessions.py`; verify it uses the 004 metadata boundary and tests never target a contributor default database (FR-011, FR-012, FR-017; SC-002, SC-005, SC-006).
- [x] T008 [P] Write service-level session/CSRF security tests in `backend/tests/test_auth_session_security.py` for D1/D2: idle/absolute expiry boundaries, current-session logout, all-session revocation on password change/deletion/trusted role change, token-to-state binding, rotation/expiry, missing/mismatched token, and invalid Origin denial. Assert safe 004 errors. Limit this task to service/helper behavior; HTTP response cookie/bootstrap integration is covered by T020 (FR-004, FR-010, FR-017; SC-002, SC-006, SC-008).
- [x] T009 [P] Write Argon2id unit tests in `backend/tests/test_password_hashing.py` for algorithm marker, m=19456 KiB/t=2/p=1, unique salt for identical passwords, correct/wrong-password verification, and non-disclosure of plaintext/verifiers (FR-007, FR-010, FR-017, FR-018; SC-005, SC-006).
- [x] T010 Add auth configuration in `backend/src/auth/config.py` and document local origin values in `backend/.env.example`: exact allowed frontend origins, the approved session timeouts, and non-secret settings only. Do not add email credentials or production database configuration (FR-004, FR-017; SC-002, SC-006).
- [x] T011 Implement the approved Argon2id verifier in `backend/src/auth/passwords.py` using `argon2-cffi==25.1.0`, m≥19 MiB, t=2, p=1, and a unique salt per password; expose verification and rehash checks without returning or logging verifier material, and benchmark/document verification cost on supported Python runtimes (FR-007, FR-017, FR-018; SC-006).
- [x] T012 Implement server-side session creation, lookup, idle/absolute expiry, and revocation in `backend/src/auth/sessions.py`; use high-entropy opaque IDs, store only their digest, and enforce approved D1 invalidation behavior (FR-004, FR-017; SC-002, SC-008).
- [x] T013 Implement reusable D2 cookie construction/clearing and synchronizer-token issue/verify primitives in `backend/src/auth/cookies.py` and `backend/src/auth/csrf.py`, including AnonymousCsrfContext/session binding, expiry, rotation, and strict Origin/Referer validation. Do not implement routes or configure CORS here (FR-004, FR-010, FR-017; SC-002, SC-006).
- [x] T014 Implement the authenticated-account dependency in `backend/src/auth/dependencies.py`; resolve the account and its current role from server-side session state on every protected request, and reject absent, expired, revoked, or disabled identities (FR-004, FR-008, FR-009, FR-014; SC-002, SC-004).
- [x] T015 Implement the shared frontend auth API client and safe auth state in `frontend/src/lib/api/client.ts` and `frontend/src/features/auth/authApi.ts`; use 004 envelopes and `credentials: include`, call `POST /auth/csrf/bootstrap` as needed, cache the token in memory before anonymous/authenticated mutations, replace it with the session-bound token returned on login, and send it in `X-CSRF-Token`. Keep passwords, cookie values, and raw CSRF tokens out of Redux and browser storage (FR-004, FR-010, FR-013, FR-017; SC-002, SC-006).

**Checkpoint**: Approved dependency pins, migrations, shared security boundaries, and the API/UI contract are ready for story work.

---

## Phase 3: User Story 1 — Create an ordinary account (Priority: P1)

**Goal**: Visitors can create an account with name, email, password, and confirmation; public input cannot grant a privileged role.

**Independent Test**: API and browser tests verify successful ordinary-user registration, safe invalid-input feedback, duplicate/concurrent email rejection without partial accounts, and rejection or ignoring of forged `admin`/`producer` role input.

### Tests for User Story 1

- [x] T016 [P] [US1] Write registration API contract tests in `backend/tests/test_auth_registration.py` for valid registration, password confirmation and FR-018 validation, duplicate and concurrent normalized email, common 201/422/conflict envelopes, safe errors, and forged role input; assert every created account has role `user` (FR-001, FR-002, FR-010, FR-012, FR-015, FR-018; SC-001, SC-005, SC-006).
- [x] T017 [P] [US1] Write the registration Playwright flow in `frontend/tests/auth-registration.spec.ts` against `docs/reference-ui/register.png`; cover accessible fields, password rule hints, validation, success, and absence of a privileged-role selector. Keep role-matrix and backend-denial checks in T031/T032 (FR-001, FR-002, FR-013, FR-018; SC-001, SC-005, SC-007).

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement registration request/response schemas and account creation route/service in `backend/src/auth/schemas.py`, `backend/src/auth/registration.py`, and `backend/src/auth/routes.py`; accept only name/email/password/confirmation, normalize identity as approved D4:B, apply Argon2id, assign `user` server-side, and prove the created-role result satisfies the clarified role-operation boundary (FR-001, FR-002, FR-008, FR-010, FR-011, FR-012, FR-015, FR-018; SC-001, SC-004, SC-005, SC-006).
- [x] T019 [P] [US1] Implement the accessible MUI registration page in `frontend/src/app/(auth)/register/page.tsx` using `docs/reference-ui/register.png`; associate field errors accessibly, show the exact approved password rule, clear secret inputs on success, and provide a sign-in link (FR-001, FR-013, FR-018; SC-001, SC-005, SC-007).

**Checkpoint**: Registration succeeds for ordinary users only, and invalid/forged submissions leave no partial or privileged account.

---

## Phase 4: User Story 2 — Sign in and sign out (Priority: P1)

**Goal**: Any active account can establish and end its own server-managed session through the approved secure-cookie and CSRF contract.

**Independent Test**: Backend and browser tests cover valid/invalid sign-in, generic failure messages, session cookie flags, CSRF enforcement, idle/absolute expiry, current-session logout, and denial after logout.

### Tests for User Story 2

- [x] T020 [P] [US2] Write HTTP integration tests in `backend/tests/test_auth_login_logout.py` for valid/invalid credentials, non-enumerating failures, actual response cookie issuance/expiry and exact flags, anonymous bootstrap context/cookie/token response, login revocation and session-cookie/token rotation, CSRF acceptance/rejection through routes, replay after logout, and unchanged `/health`. Keep detailed expiry/revocation/token-service boundary tests in T008 (FR-003, FR-004, FR-010, FR-017; SC-002, SC-005, SC-006).
- [x] T021 [P] [US2] Write the Playwright sign-in/out journey in `frontend/tests/auth-session.spec.ts` against `docs/reference-ui/login.png`; cover anonymous CSRF bootstrap before login, generic failed login, successful session and CSRF-token rotation to the authenticated binding, cookie HttpOnly/Secure/SameSite behavior, rejection of a forged mutation, logout, and denial after logout (FR-003, FR-004, FR-013, FR-017; SC-002, SC-006, SC-007).

### Implementation for User Story 2

- [x] T022 [P] [US2] Implement only the HTTP route layer in `backend/src/auth/routes.py` for CSRF bootstrap, login, logout, and current-session operations; delegate token binding/verification and cookie construction to T013, use the separate AnonymousCsrfContext from T006/T007, set/rotate/expire only the approved `__Host-dw_session` cookie, and return safe 004 envelopes with generic credential failures (FR-003, FR-004, FR-010, FR-017; SC-002, SC-006). T013 owns reusable security primitives; T022 owns route orchestration and wire behavior.
- [x] T023 [P] [US2] Implement the MUI sign-in page and logout control in `frontend/src/app/(auth)/login/page.tsx` and `frontend/src/features/auth/components/SignOutButton.tsx`, following `docs/reference-ui/login.png`; call the shared client, show generic errors, and retain only safe account summary/auth status in Redux (FR-003, FR-013; SC-005, SC-007).

**Checkpoint**: Successful sign-in grants only the caller's server-side session; logout and expiry revoke the corresponding access.

---

## Phase 5: User Story 3 — Manage personal profile and account (Priority: P2)

**Goal**: Signed-in users, administrators, and producers can view and manage only their own profile, password, and account lifecycle.

**Independent Test**: For every role, verify own-profile read/update, email stays unverified, valid/invalid password change behavior, explicit-confirmation deletion, and disabled-account denial.

### Tests for User Story 3

- [x] T024 [P] [US3] Write profile/password API tests in `backend/tests/test_auth_profile.py` for own `GET/PATCH /auth/me`, allowed-field validation/no partial update, D4:B email normalization and fixed `email_verified: false`, current-password proof required only for email changes, generic 409 duplicate-email response, confirmation, and FR-018 boundaries; assert password change revokes every session (FR-005–FR-007, FR-010, FR-016–FR-018; SC-003, SC-005, SC-006).
- [x] T025 [P] [US3] Write account deactivation API tests in `backend/tests/test_account_deactivation.py` for the exact `{current_password, confirmation: "DELETE"}` payload; assert missing/mismatched confirmation returns 422, missing/wrong current password returns safe 403, success returns HTTP 200 `{data:{status:"disabled"}}`, revokes all sessions, and denies later sign-in; invalid deletion leaves account and associated data unchanged (FR-010, FR-014; SC-005, SC-008).
- [x] T026 [P] [US3] Write the Playwright profile journey in `frontend/tests/auth-profile.spec.ts` using `docs/reference-ui/profile.png`; cover visible “Neverificat” email status, read-only role display, accessible edit/password/delete dialogs, profile success/errors, current-password failures, explicit deletion confirmation, sign-out/deactivation outcome, and responsive keyboard use (FR-005–FR-007, FR-013–FR-014, FR-018; SC-003, SC-005, SC-007, SC-008).

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement `GET/PATCH /auth/me` and profile service operations in `backend/src/auth/profile.py`; return only the caller's safe fields including fixed `email_verified: false`, permit only approved profile fields, require current-password proof iff email changes, return generic 409 for a duplicate normalized identity, and leave email unverified (FR-005, FR-006, FR-010, FR-016; SC-003, SC-005, SC-006).
- [x] T028 [P] [US3] Implement `POST /auth/me/password` in `backend/src/auth/credentials.py`; verify the current password, require matching confirmation and the exact FR-018 rule, atomically replace the verifier, revoke all active sessions, and disclose no verifier material (FR-007, FR-010, FR-017, FR-018; SC-005, SC-006).
- [x] T029 [P] [US3] Implement `DELETE /auth/me` in `backend/src/auth/account_lifecycle.py`; accept `current_password` and exact `confirmation: "DELETE"`, return 422 for missing/mismatched confirmation and safe 403 for invalid current password, then return HTTP 200 `{data:{status:"disabled"}}`, disable the account, revoke all sessions, clear the current cookie, and leave product data retention to owning features (FR-010, FR-014; SC-005, SC-008).
- [x] T030 [US3] Implement the responsive MUI profile page in `frontend/src/app/(account)/profile/page.tsx`, profile editor in `frontend/src/features/auth/components/ProfileEditor.tsx`, and password/deactivation dialogs in `frontend/src/features/auth/components/AccountSecurityDialogs.tsx`; follow `docs/reference-ui/profile.png`, visibly label email “Neverificat”, keep role read-only, use accessible errors and exact deletion confirmation, and clear Redux auth state after logout/deactivation (FR-005, FR-006, FR-007, FR-013, FR-014, FR-018; SC-003, SC-007, SC-008).

**Checkpoint**: All roles can manage their own account only; password changes/deactivation follow the approved proof and invalidation rules.

---

## Phase 6: User Story 4 — Enforce role-protected access (Priority: P1)

**Goal**: Backend authorization permits self-service for each of the three roles and denies unauthenticated, cross-account, forged-role, and otherwise unassigned access.

**Independent Test**: Run an access matrix for visitor, `user`, `admin`, and `producer` against every auth/profile operation; only self-service is allowed for authenticated active accounts, with no cross-account read or mutation.

### Tests for User Story 4

- [x] T031 [P] [US4] Write the role and ownership matrix in `backend/tests/test_auth_access_matrix.py`; parameterize visitor/user/admin/producer against every protected route, verify each active role can access only its own profile/password/account operations, deny reads or mutations targeting another account (including guessed non-self account routes), reject caller-supplied account ID or role/status changes, deny disabled/expired/revoked sessions, and verify trusted role change revokes active sessions (FR-002, FR-008, FR-009, FR-014–FR-017; SC-002–SC-006, SC-008).
- [x] T032 [P] [US4] Add Playwright checks in `frontend/tests/auth-role-boundaries.spec.ts` that the profile role is read-only for user/admin/producer fixtures and client-side route visibility is presentation only. Registration selector absence belongs to T017; backend authorization denial belongs to T031 (FR-008, FR-009, FR-013, FR-016; SC-004, SC-007).

### Implementation for User Story 4

- [x] T033 [US4] Enforce self-account ownership and default-deny checks in `backend/src/auth/authorization.py` and apply them to every protected auth/profile route; derive actor and role only from the current server session, reject caller-supplied account/role/status fields, and provide a session-revocation helper for trusted out-of-band role changes without adding a role-management endpoint (FR-002, FR-008, FR-009, FR-015, FR-016; SC-003, SC-004).

**Checkpoint**: All tested role/operation combinations match the confirmed policy; no role can read or modify another account in 005.

---

## Phase 7: Integration and Cross-Cutting Verification

**Purpose**: Verify feature-wide contracts, accessibility, contributor setup, compatibility, and scope boundaries.

- [x] T034 Integrate the registration, session, and profile routers in `backend/src/main.py`; retain shared error handlers and verify `GET /health` still returns exactly `{ "status": "ok" }` (FR-004, FR-010; SC-002, SC-006).
- [x] T035 [P] Update `backend/README.md`, `frontend/README.md`, and `specs/005-auth-and-roles/quickstart.md` with approved local setup, exact dependency pins, temporary SQLite test isolation, secure-cookie/CSRF test setup, the Playwright browser-install command, and backend/Playwright commands; document D4:B unverified email and no email delivery (FR-010, FR-013, FR-017; SC-005, SC-006, SC-007).
- [x] T036 Run backend static compilation and `python -m pytest` from `backend/`; verify backend OpenAPI 3.1/common 004 envelopes, safe generic 500, unchanged `/health`, session/cookie/CSRF behavior, all role/ownership cases, persistence isolation, and no secret leakage (FR-001–FR-018; SC-001–SC-006, SC-008).
- [x] T037 Run `npm run type-check` and `npm run build` from `frontend/`; verify the UI build and accessible registration, sign-in, and profile screens (FR-001, FR-003, FR-005–FR-007, FR-013, FR-018; SC-001, SC-003, SC-007).
- [x] T038 Run `npm run test:e2e` from `frontend/`; verify browser registration/sign-in/profile/account lifecycle, CSRF bootstrap and rotation, role display, keyboard/accessibility checks, and absence of out-of-scope routes/screens (FR-001–FR-007, FR-013–FR-014, FR-018; SC-001–SC-003, SC-005, SC-007–SC-008).

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T003; T001 and T002 are independent. T003 follows T002.
- **Foundational (Phase 2)**: T004–T015; depends on approved 003/004 foundations and Setup. T004 is complete; T005/T008 are test-authoring tasks; persistence tests precede T006/T007, and security tests precede T010–T014 implementation.
- **US1 (Phase 3)**: Depends on all foundational tasks; T016/T017 are authored before T018/T019.
- **US2 (Phase 4)**: Depends on foundational security and US1 account creation; T020/T021 precede T022/T023.
- **US3 (Phase 5)**: Depends on authenticated sessions from US2; T024–T026 precede T027–T030.
- **US4 (Phase 6)**: Depends on all protected operations from US1–US3; T031/T032 precede T033.
- **Integration (Phase 7)**: T034 follows all backend route implementations; T035 documents delivered commands; T036–T038 separately verify backend, frontend build, and browser journeys.

### Traceability Summary

| Story | Requirements | Acceptance coverage |
|---|---|---|
| US1 Registration | FR-001, FR-002, FR-010–FR-012, FR-015, FR-018 | SC-001, SC-004–SC-007 |
| US2 Session | FR-003, FR-004, FR-010, FR-013, FR-017 | SC-002, SC-005–SC-007 |
| US3 Profile/account | FR-005–FR-007, FR-010, FR-013–FR-014, FR-016–FR-018 | SC-003, SC-005–SC-008 |
| US4 Authorization | FR-002, FR-008–FR-009, FR-014–FR-017 | SC-002–SC-006, SC-008 |
| Foundation/cross-cutting | FR-004, FR-010–FR-012, FR-017–FR-018 | SC-002, SC-005–SC-006 |

### Parallel Opportunities

- T001 and T002 can run in parallel; T003 follows the frontend package/lock update.
- T005, T008, and T009 can be authored in parallel after the API contract T004 because they touch separate backend test files. T008 covers security-service boundaries; T020 covers HTTP route/wire integration.
- Within each user story, backend test authoring and Playwright test authoring can run in parallel. Backend and frontend implementation can run in parallel after both contracts and tests are settled, because they own separate paths.
- T024, T025, and T026 are separate test files; T027–T029 are separate backend modules and can be parallelized after those tests are written.
- T031 and T032 can be authored in parallel; T033 depends on their coverage and on the completed auth operations.

### MVP and Incremental Delivery

1. Complete Setup and Foundational phases; this unlocks all stories.
2. Deliver **US1 registration** as the first user-visible increment: public registration creates only an ordinary account and rejects invalid/privileged input.
3. Deliver **US2 sign-in/out** so a registered account can establish and terminate its approved server-side session.
4. Deliver **US3 self-profile and account lifecycle**.
5. Deliver **US4 full access matrix** and complete cross-cutting verification before acceptance.

No task adds email delivery, verification messages, admin/producer dashboards, management of other accounts, vehicles, routes, or history.

## Phase 8: Convergence

**Purpose**: Close the implementation and evidence gaps found by the read-only convergence review. These tasks retain the approved D1–D7 decisions and feature scope.

- [x] T039 Refresh `AnonymousCsrfContext.last_seen_at` after each valid token-bound anonymous request and on valid anonymous bootstrap reuse; ensure authenticated bootstrap activity follows the D1 idle policy without extending the 8-hour absolute lifetime. Add boundary tests for activity before/after 30 minutes and absolute expiry. (D1, D7; FR-004, FR-017; SC-002, SC-006)
- [x] T040 Make registration and password-change validation actionable and accessible: identify mismatched confirmation and each unmet FR-018 condition without echoing secrets; map safe API error codes/fields into clear user-facing text consistent with the Romanian UI. Add Playwright coverage for invalid/mismatched registration and password-change submissions and verify no partial update. (FR-001, FR-007, FR-013, FR-018; SC-005, SC-007)
- [x] T041 Extend browser-level security checks to inspect the `__Host-dw_session` cookie flags, prove anonymous bootstrap and login rotate the cookie identifier and CSRF token binding, and assert a mutation with a forged `X-CSRF-Token` receives 403 before a valid logout succeeds. Keep the existing Edge-backed run evidence and standard Playwright Chromium setup documented. (D2, D7; T021, FR-004, FR-017; SC-002, SC-006)
- [x] T042 Refactor the profile UI into the focused planned components `ProfileEditor.tsx`, `AccountSecurityDialogs.tsx`, and `SignOutButton.tsx`, with typed interfaces and the planned App Router groups; keep safe account summary in Redux and secrets in transient component state only. Verify keyboard behavior and narrow/wide layouts. (Constitution II–III; T023, T030; FR-013; SC-007)
- [x] T043 Split the combined tests into the task-referenced files `auth-registration.spec.ts`, `auth-session.spec.ts`, `auth-profile.spec.ts`, `test_auth_login_logout.py`, and `test_account_deactivation.py`; preserve all existing assertions and verify each task's traceability to its dedicated test file. (T017, T020–T021, T024–T026; FR-001–FR-007, FR-013–FR-014, FR-018; SC-001–SC-008)
- [x] T044 Extract the generic HTTP envelope, credentialed-fetch, and CSRF transport behavior into `frontend/src/lib/api/client.ts`, and expose typed auth operations through `frontend/src/features/auth/authApi.ts`; preserve the in-memory-only token lifecycle and verify login rotation and error decoding. (Constitution I, IV; plan: Architecture and Ownership; T015; FR-004, FR-010, FR-013, FR-017; SC-002, SC-006)
- [x] T045 Complete and record the approved Argon2id cost benchmark on each supported Python runtime (3.11, 3.12, and 3.13), using only the pinned dependency; document any unavailable runtime explicitly and keep the approved parameters unchanged unless the owner approves a new decision. (D3; T011, FR-017; SC-006)


## Phase 9: Convergence

- [x] T046 CRITICAL: Consolidate the safe account summary under Redux as its single shared owner; remove the competing profile copy in `ProfilePage` and read/update the profile through that shared state, keeping only transient form and UI interaction state locally. Preserve protected-route handling and auth clearing after logout/deactivation; verify profile reads and updates stay consistent. (Constitution III; FR-005, FR-006; SC-003, SC-007; contradicts)
- [x] T047 Render password-change and account-deactivation validation/API errors inside the active `AccountSecurityDialogs` modal with accessible announcements; do not report them only in the obscured `ProfilePage` background. Add Playwright assertions using accessible alert/status roles for each unmet FR-018 password condition, mismatched confirmation, wrong current password, and invalid deletion confirmation; verify failed requests leave account state unchanged. (FR-007, FR-013; SC-005, SC-007; T040; partial; HIGH)
