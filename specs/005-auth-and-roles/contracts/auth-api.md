# Proposed API Contract: Authentication and Self-Profile

**Status**: D1-D7 approved by the owner; contract implemented and verified.

## Shared Contract Rules

- Transport: HTTP/JSON; schema: FastAPI-generated OpenAPI 3.1, using Pydantic 2.13.5.
- Success response: 004 `{ "data": ... }` envelope.
- Error response: 004 `{ "error": { "code", "message", "details?", "request_id?" } }` envelope. Invalid request input returns 422; unexpected server errors return generic 500; 404/405 preserve the common envelope and protocol-required headers.
- Authentication and profile failures return safe messages and no password, verifier, cookie/session identifier, stack trace, or internal detail.
- `/health` remains HTTP 200 `{ "status": "ok" }` and is unchanged.
- API contract changes remain backward-compatible by default under 004. No URL versioning is introduced.
- Cookie, authenticated-session expiry/invalidation, synchronizer-token CSRF, strict Origin validation, exact-origin credentialed CORS, and anonymous CSRF state follow approved D1/D2/D7. D4:B makes the email identifier unverified; no email provider or verification workflow is included.

## Proposed Operations

### `POST /auth/register`

Public request body:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "ExamplePass1!",
  "password_confirmation": "ExamplePass1!"
}
```

The role is not accepted from the caller; successful registration creates `user`. Success is HTTP 201 with the safe account profile in `data`; registration does not itself create an authenticated session. Input/password rule failures use HTTP 422. A duplicate normalized email uses HTTP 409 with code `email_unavailable` and generic message `Email is unavailable`, which does not confirm whether an account exists. Email normalization follows approved D4:B: preserve display spelling and compare trimmed addresses case-insensitively; mailbox ownership is not verified in 005.

Under approved D4:B, the email identifier is always unverified in this feature. Responses expose `email_verified: false` as a fixed contract value, not a persisted verification workflow or claim of mailbox ownership.

### `POST /auth/csrf/bootstrap`

Creates or rotates the browser's CSRF context and is the only state-changing operation exempt from presenting a CSRF token. It requires an exact allowed `Origin`; when `Origin` is absent, require an exact allowed `Referer`. If both headers are absent, or the supplied origin/referrer is not an exact allowed origin, return HTTP 403 with the common safe error envelope. Credentialed CORS still allows only the configured frontend origin. It is safe to repeat and never authenticates a user.

- For a visitor without a recognized cookie, create an anonymous `AnonymousCsrfContext`, set a random opaque context identifier in the `__Host-dw_session` cookie using the approved D2 attributes, and return HTTP 200 with a synchronizer token in `{ "data": { "csrf_token": "..." } }`.
- For a recognized anonymous context, revoke the prior context and replace it with a new identifier and token.
- For an authenticated session, rotate only its CSRF token verifier and return the replacement token; do not change the authenticated session identifier or cookie.
- Store only digests/verifiers for identifiers and CSRF tokens. Anonymous contexts expire after 30 minutes of inactivity or 8 hours absolute, matching D1. An expired or revoked context is never accepted.

All other state-changing requests, including anonymous registration and login, require the cookie and matching `X-CSRF-Token` header, a valid unexpired server-side binding, and strict Origin/Referer validation. Missing, mismatched, expired, revoked, or wrong-context tokens are rejected with HTTP 403 and the common safe error envelope. No raw CSRF token or cookie identifier is returned except the CSRF token in the bootstrap/login response and the opaque cookie value in `Set-Cookie`.

### `POST /auth/login`

Request: `{ "email": "...", "password": "..." }`.

On a valid active account, revoke the anonymous CSRF context, rotate the cookie to a new random authenticated-session identifier, and return HTTP 200 with the safe account summary and a new session-bound `csrf_token` under `data`; send the session identifier only in the approved `Set-Cookie` header. Wrong email, wrong password, or disabled account use non-enumerating authentication failure behavior. Cookie attributes and session policy follow approved D1/D2/D7. Do not promote the anonymous context into an authenticated session.

### `POST /auth/logout`

Requires an authenticated current session and approved D2 CSRF protection. Revoke the current session on the server, expire its cookie, and return HTTP 200 with `{ "data": { "status": "signed_out" } }`. Repeating a request with an absent/expired session must not recreate access.

### `GET /auth/me`

Requires an active authenticated session. Returns only the caller's name, email, role, and permitted public account state under `data`. It never returns credential or session fields.

### `PATCH /auth/me`

Requires an active session and approved D2 CSRF defense. Request accepts optional `name`, optional `email`, and `current_password` only when `email` is supplied. At least one editable field is required; unknown fields are rejected with 422. Email changes require a correct current password, preserve the submitted display spelling, compare trimmed addresses case-insensitively for uniqueness, and remain unverified (`email_verified: false`). A missing/wrong current password returns 403 with a safe `invalid_current_password` error; a duplicate normalized address returns 409 with generic wording that does not disclose another account. Role and account status are never editable. Success returns HTTP 200 with the updated safe profile in `data`.

Name-only update:

```json
{ "name": "Alex Morgan" }
```

Email update:

```json
{ "email": "alex@example.com", "current_password": "ExamplePass1!" }
```

### `POST /auth/me/password`

Requires active session and selected CSRF defense. Request includes `current_password`, `new_password`, and `new_password_confirmation`. Verify current password and apply FR-018. Return only a success status in `data`; never return or log password/verifier. Session invalidation follows D1.

### `DELETE /auth/me`

Requires an active session, approved D2 CSRF defense, and this request body:

```json
{ "current_password": "ExamplePass1!", "confirmation": "DELETE" }
```

Missing or non-matching confirmation returns 422; a missing or incorrect current password returns 403 with a safe `invalid_current_password` error. On success, disable the account, revoke all its sessions, expire the current cookie, and return HTTP 200 with `{ "data": { "status": "disabled" } }`. Data owned by future product features follows those features' retention/deletion policies.

## Authorization Matrix

| Operation | Visitor | Ordinary user | Administrator | Producer |
|---|---|---|---|---|
| Register | Allowed; creates ordinary role only | N/A | N/A | N/A |
| Sign in | Allowed with valid credentials | Own account | Own account | Own account |
| Logout | Denied/no active session | Own session | Own session | Own session |
| Read/edit own profile | Denied | Allowed | Allowed | Allowed |
| Change own password | Denied | Allowed with current password | Allowed with current password | Allowed with current password |
| Disable own account | Denied | Allowed with current password + explicit confirmation | Same | Same |
| Read/change another account | Denied | Denied | Denied in this feature | Denied in this feature |
| Assign/change roles | Denied | Denied | No endpoint in this feature | Denied |

## Required API Tests

- OpenAPI 3.1 schemas/response declarations follow the existing 004 helpers.
- Bootstrap and login contract tests cover anonymous context creation/replacement, cookie attributes and identifier rotation, token binding/rotation, D1-compatible expiry, exact Origin/Referer validation, and anonymous registration/login requests. Authenticated bootstrap rotates the CSRF token verifier without rotating the session cookie.
- Invalid request input is 422 with the common safe error envelope; unexpected exceptions are generic 500.
- Missing/invalid session gets denied; authenticated user can access only own account operations.
- Cross-account profile/password/deletion attempts are denied for each role.
- Public role injection cannot create administrator or producer accounts.
- Login failure responses do not reveal account existence; duplicate registration behavior follows reviewed generic wording.
- Approved cookie, CSRF, expiration, password-change, role-change, and deletion invalidation behaviors are covered by tests.
- The existing `/health` response is unchanged.
