# Implementation Plan: Authentication and Roles

**Branch**: `005-auth-and-roles` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Clarified feature specification, completed requirements checklist, Drive Wise constitution, and approved designs for `003-backend-setup` and `004-api-and-data-foundation`.

**Status**: Decisions D1 through D7 approved; implementation complete.

## Summary

Add account registration, email/password sign-in, server-managed cookie sessions, logout, self-service profile and password management, self-service account deactivation, and backend enforcement of the clarified role policy. Reuse the existing FastAPI application, Pydantic request validation, shared API envelopes/errors, SQLAlchemy/Alembic persistence foundation, Python and frontend stacks, and existing verification commands. Preserve `/health` exactly.

Public registration creates ordinary-user accounts only. A trusted operator assigns administrator or producer roles through a process outside public registration and outside this feature's UI/API. All three roles can manage only their own profile and password within this feature. No dashboard, account administration, vehicle, trip, or external-service workflow is included.

The security policy choices, anonymous CSRF state decision, and frontend integration-test runner decision are approved as recorded in [research.md](research.md). Exact dependency pins are recorded below, checked against the declared Python and Node runtime support, and installed. Implementation and verification are recorded in [tasks.md](tasks.md).

## Technical Context

**Language/Version**: Backend Python 3.11–3.13, retaining 003; Python 3.13 is the verified local runtime. Frontend TypeScript and React versions remain those pinned by `frontend/package.json` and `package-lock.json`.

**Primary Dependencies**: Retain FastAPI 0.115.6, Uvicorn 0.34.0, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, pytest 8.3.4, and httpx 0.28.1. Frontend retains Next.js 16.3.7, React 19.3.0, TypeScript 5.9.3, Redux Toolkit 2.13.0, React Redux 9.3.0, and MUI 9.4.0. Approved additions installed for this feature are `argon2-cffi==25.1.0` and frontend dev dependency `@playwright/test==1.56.1`.

**Storage**: Use the 004 SQLAlchemy engine/session and Alembic migration boundary. SQLite remains approved for local development and isolated tests only; 004 did not select a production database. Account/session storage for a production deployment cannot be claimed by this feature without a separate data-platform decision.

**Testing**: Backend checks use the existing pytest 8.3.4 + FastAPI `TestClient`/httpx 0.28.1, `python -m compileall src`, and isolated temporary SQLite databases. Frontend uses the existing `npm run type-check` and `npm run build`, plus approved `@playwright/test==1.56.1` browser tests. The intended verification scenarios are documented in [quickstart.md](quickstart.md).

**Target Platform**: Local contributor development using the existing Node.js 20.9+ and Python 3.11–3.13 baselines. A production deployment target, production database, and email service are not selected.

**Project Type**: Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: No product throughput target is introduced. Argon2id was measured on the available Python 3.13.15 runtime (ten local hash/verify samples; observations recorded in `quickstart.md`). Python 3.11 and 3.12 were unavailable on the implementation machine; the approved cost parameters remain unchanged. Session expiration is server-enforced according to the approved policy.

**Constraints**: Follow 004 HTTP/JSON, OpenAPI 3.1, `{data}` success and `{error}` failure conventions, status handling, input validation, and compatibility-by-default. Keep `/health` `{ "status": "ok" }`. Use Argon2id only under the owner-approved D3 settings; do not infer JWT, email delivery, production storage, or privileged self-enrollment from legacy materials. Password complexity and the broad password/profile flows clarified in the specification are approved requirements.

**Scale/Scope**: One account identity, three role values, server-managed sessions, self-service account/profile endpoints, and three frontend flows (sign-in, registration, profile). No role-management interface or product endpoint.

## Approved Owner Decisions

Approved decisions and their original alternatives, tradeoffs, and source notes are in [research.md](research.md).

| ID | Approved decision | Approved choice | Status |
|---|---|---|---|
| D1 | Idle/absolute session expiry and invalidation after password changes | 30-minute idle + 8-hour absolute server timeout; successful password change revokes all sessions and requires sign-in again | Approved A |
| D2 | Cookie attributes, CSRF protection, and credentialed frontend/backend origin policy | `__Host-dw_session` cookie with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`; synchronizer CSRF token plus strict Origin validation and exact-origin CORS | Approved A |
| D3 | Password hashing algorithm and parameters | Argon2id, at least 19 MiB memory, 2 iterations, parallelism 1, unique per-password salt; `argon2-cffi==25.1.0` | Approved A |
| D4 | Email identity normalization and address ownership verification without assuming mail delivery | Preserve entered spelling, compare trimmed addresses case-insensitively, do not verify mailbox ownership in 005, and treat email as an unverified sign-in identifier | Approved B |
| D5 | Effective role change for existing sessions | Revoke all sessions when the trusted provisioning process changes a role; the new role takes effect on the next sign-in | Approved A |
| D6 | Frontend behavior/integration test runner (not present in the repository) | Add `@playwright/test==1.56.1` for browser-driven frontend-to-API flows; keep pytest for backend authorization and API checks | Approved A |
| D7 | Persistence model for anonymous CSRF bootstrap state and cookie rotation on login | Use a separate `AnonymousCsrfContext` persistence entity, identify it with the approved `__Host-dw_session` cookie, expire it after 30 minutes idle/8 hours absolute, revoke it on login, and issue a new authenticated session identifier and CSRF token | Approved A |

**Implementation gate**: D1 through D7 and their exact pins were approved before implementation. D7:A resolves anonymous CSRF state persistence and login rotation. D4:B does not require email delivery or a provider; email remains unverified in this feature. Implementation followed the approved tasks.

## Decisions Already Approved by Specification or Earlier Features

- `003-backend-setup`: Python 3.11–3.13, FastAPI 0.115.6, Uvicorn 0.34.0, `pip`, `requirements.txt`, pytest 8.3.4, `backend/src/`, and the unchanged technical `/health` route.
- `004-api-and-data-foundation`: HTTP/JSON; FastAPI-generated OpenAPI 3.1 with no committed generated document; Pydantic 2.13.5; `{ "data": ... }` future success envelope; common safe `{ "error": { "code", "message", "details?", "request_id?" } }` errors; 422 invalid input, generic 500, common 404/405; backward-compatible by default; SQLAlchemy 2.0.54/Alembic 1.20.0 and credential-free SQLite local/test store via `DRIVE_WISE_DATABASE_URL`.
- `005` clarification: public registration creates only ordinary users; a trusted operator provisions/promotes administrator and producer accounts outside the public flow; every role manages only its own profile/password in this feature; authentication is email/password with a server-managed secure-cookie session; logout ends the current session; password policy is the specified eight-character/uppercase/number/special-character rule; password changes and account deletion require the current password; deletion also requires explicit confirmation, disables the account, and follows associated-data policies owned by other features.

## Constitution Check

*GATE: Scope PASS. D1 through D7 approved; implementation and task verification complete.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Next.js owns screens and client coordination; FastAPI owns account identity, validation, persistence, sessions, and authorization. Protected account operations have explicit API contracts. | PASS |
| II. Compatible, Reusable Frontend | Reuse pinned React/TypeScript/Redux/MUI stack and App Router. Keep components focused and typed; the approved Playwright runner is the only new frontend dependency. | PASS |
| III. One Authority for Shared Client State | Redux may hold the safe current-account summary and auth status; passwords and session IDs/cookies are never copied into Redux or browser storage. The HttpOnly cookie is the sole browser-held session credential. | PASS, D2 approved |
| IV. Explicit Contracts and Backend-Enforced Access | Contracts use 004 envelopes/validation/errors. Backend checks session and current account role on every protected operation; client route guards are presentation only. | PASS, D1-D7 approved |
| V. Verified, Accessible User Outcomes | Backend tests cover authentication, role matrix, own-account boundaries, failure safety, deletion, and session behavior. Browser tests cover accessible forms and end-to-end flows using approved Playwright. | PASS for planned coverage |
| Technology Constraints and Open Decisions | Reuse approved 003/004 dependencies. D1 through D7 are resolved. Email delivery and production database remain out of scope. | PASS |
| SDD Development and Review | This plan and design contracts precede task breakdown and implementation. | PASS; the owner later authorized and completed implementation |

## Architecture and Ownership

```text
Browser / Next.js App Router
  Sign-in, registration, profile pages
  Redux: safe current-account summary only
  fetch(credentials: include) + approved CSRF header
                 │ HTTP/JSON, exact allowed origin
                 ▼
FastAPI auth router and dependencies
  Pydantic validation → safe 004 error envelope
  server-side session lookup → current Account role
  self-account authorization → account/profile/password operations
                 │ SQLAlchemy 2.x session boundary
                 ▼
SQLite local/test store via 004 foundation
  Account + server-managed AuthSession + AnonymousCsrfContext
  Alembic migration; no product tables
```

The approved cookie, CSRF mechanism, exact CORS policy, and timeout values follow D1/D2/D7. `POST /auth/csrf/bootstrap` binds a synchronizer token to a separate anonymous server-side context and the `__Host-dw_session` cookie; it requires strict Origin/Referer validation. On login, revoke the anonymous context, rotate the cookie identifier, and issue a new token bound to the authenticated session. Anonymous contexts expire after 30 minutes idle or 8 hours absolute. The browser must never receive session IDs in JSON or store credentials/session IDs in localStorage, sessionStorage, or Redux. Raw CSRF tokens may be held in memory only. The account's current role is authoritative on the backend; no role is accepted from client input.

## API and Frontend Contract Design

See [contracts/auth-api.md](contracts/auth-api.md) and [contracts/auth-ui.md](contracts/auth-ui.md). Proposed operations are `POST /auth/csrf/bootstrap`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/me/password`, and `DELETE /auth/me`. The contract exposes only self-service; it defines no privileged role-assignment endpoint.

Successful responses use 004's `{ "data": ... }` envelope; failures use its common safe `{ "error": ... }` shape. Request models reject invalid fields at the API boundary. Existing `/health` remains unchanged and outside the success envelope. OpenAPI is generated by FastAPI and not committed.

Under approved D4:B, email is always an unverified identifier, displayed with an unverified status; no verification state is persisted and no email delivery or ownership check occurs. Email changes require current-password proof and remain unverified. Registration success does not automatically establish a session; the user is directed to sign in.

For browser/API connectivity, the frontend reads the non-secret `NEXT_PUBLIC_API_BASE_URL`; the backend uses `DRIVE_WISE_ALLOWED_ORIGINS` as an exact-origin allowlist, with only the local frontend origin enabled in local development. Credentialed CORS never uses a wildcard.

## Persistence and Security Boundaries

- Extend the 004 persistence boundary with account, authenticated-session, and separate anonymous CSRF context tables in an Alembic revision. Use temporary SQLite files for automated checks and do not touch the developer default database.
- Store a password verifier only; never plaintext passwords. Use approved Argon2id parameters and the exact `argon2-cffi==25.1.0` pin.
- Store only a digest of the high-entropy session identifier server-side; the raw ID is sent only in the approved HttpOnly cookie. Apply the D2 cookie and CSRF controls.
- Account deletion marks the account disabled and revokes every active session. This feature does not cascade-delete or reinterpret product data; owning features define retention/deletion.
- Public registration always creates the ordinary role. Test fixtures may create each role for access-matrix tests. No admin dashboard, account-management endpoint, role-grant UI, or role-grant command is added.
- SQLite is local/test only per 004. A production database and production session-store deployment are not selected here.

## Project Structure

### Documentation (this feature)

```text
specs/005-auth-and-roles/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── auth-api.md
    └── auth-ui.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.py                         # Mount auth router; preserve /health
│   ├── auth/
│   │   ├── routes.py                   # Registration, login, logout, /me, password, deletion
│   │   ├── schemas.py                  # Pydantic request/response contracts
│   │   ├── dependencies.py             # Current account/session and self-authorization
│   │   ├── service.py                  # Account lifecycle operations
│   │   ├── sessions.py                 # Server-side session lifecycle (D1/D2 approved)
│   │   └── passwords.py                # Argon2id verifier (D3 approved)
│   └── data/
│       └── models/
│           ├── account.py
│           └── auth_session.py
├── migrations/versions/0002_auth_accounts_sessions.py
└── tests/
    ├── test_auth_contracts.py
    ├── test_auth_access_matrix.py
    ├── test_auth_profile.py
    ├── test_password_policy.py
    ├── test_session_lifecycle.py
    └── test_account_deactivation.py

frontend/
├── src/app/(auth)/login/page.tsx
├── src/app/(auth)/register/page.tsx
├── src/app/(account)/profile/page.tsx
├── src/features/auth/
│   ├── components/
│   ├── authSlice.ts                    # Safe profile/auth status only
│   └── authApi.ts
├── src/lib/api/client.ts              # JSON envelopes, credentials, CSRF (D2 approved)
└── tests/auth-flows.spec.ts            # Playwright 1.56.1 browser tests (D6 approved)
```

The paths describe planned ownership and may be adjusted during task breakdown without changing the public contract. No code files have been created by the planning phase.

## Verification Strategy

1. Preserve backend `python -m compileall src` and `python -m pytest`; no backend test framework is added.
2. Backend contract tests verify request schemas, OpenAPI 3.1 declarations, 004 envelopes/statuses, cookie headers, and safe error responses without altering `/health`.
3. Backend authorization tests enumerate unauthenticated and user/admin/producer sessions against own-account and other-account profile/password/deletion operations. Only self operations are allowed; cross-account attempts are denied. Public role injection is rejected and registered accounts are ordinary users.
4. Backend lifecycle tests verify current-password and confirmation failures, approved password rule boundaries, password verifier non-disclosure, logout/current-session invalidation, approved expirations, password-change invalidation, role-change invalidation/effect, account deactivation, and all-session revocation.
5. Persistence tests use an isolated temporary SQLite database and migration fixture. They cover unique email identity, account/session rows, transaction rollback, concurrent duplicate registration, disabled accounts, and cleanup.
6. Frontend `npm run type-check` and `npm run build` remain required. Playwright tests drive the real Next.js UI against a local FastAPI server and temporary SQLite store; they cover registration/sign-in, field-level errors, profile view/edit, password change, logout, deletion confirmation, denied access, keyboard operation, and narrow layouts.
7. Do not mark the implementation accepted until the documented scenarios and approved session/security settings pass on the supported local runtimes.

## Dependencies and Sequencing

1. D1-D7 are approved in [research.md](research.md#approved-owner-decisions); D4:B keeps email delivery out of scope.
2. Implementation installed only the recorded exact pins `argon2-cffi==25.1.0` and `@playwright/test==1.56.1`; 003/004 pins remain unchanged.
3. Finalize the API contract from approved D1-D7, including anonymous CSRF bootstrap and login rotation.
4. Add account/session/anonymous CSRF context persistence plus Alembic migration through the 004 boundary.
5. Implement backend account lifecycle and authorization, then frontend forms/state/API client, then integration coverage and contributor guidance.
6. Run the full approved validation sequence, review accessibility and security boundaries, and verify no out-of-scope screens or endpoints were added.

The plan records the decisions used by implementation. Completed code, documentation, and test outcomes are listed in `tasks.md` and the feature quickstart.

## Complexity Tracking

No constitution exception is proposed. The owner approved a frontend browser-test dependency and password-hashing dependency. Exact pins and runtime compatibility are documented and were installed for implementation.
