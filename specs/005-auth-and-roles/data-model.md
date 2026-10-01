# Data Model: Authentication and Roles

**Status**: Implemented shape aligned with approved decisions D1 through D7.

## Account

Represents one Drive Wise sign-in identity and its self-service profile.

| Field | Meaning | Constraints |
|---|---|---|
| Account identifier | Stable opaque identity used by session references | Unique, not accepted from public registration |
| Name | User-visible profile name | Required at registration; backend-validated |
| Email | Sign-in identifier and visible profile field | Preserve original spelling; unique comparison/normalization follows approved D4:B; mailbox ownership remains unverified |
| Password verifier | One-way verifier for the password | Never plaintext or reversibly encrypted; approved Argon2id settings: m=19 MiB minimum, t=2, p=1; `argon2-cffi==25.1.0` |
| Role | `user`, `admin`, or `producer` | Public registration always assigns `user`; privileged changes only through trusted out-of-band provisioning |
| Account status | `active` or `disabled` | Only active accounts may authenticate; deletion sets disabled |
| Created/updated timestamps | Account lifecycle metadata | Server assigned |
| Email verification state | Not persisted in this feature | D4:B keeps email unverified; API exposes the fixed `email_verified: false` value and UI labels it “Neverificat”. No verification field, token, or delivery flow is stored or implemented. |

## Server-Managed Authentication Session

Represents one authenticated browser session; it is linked to exactly one account.

| Field | Meaning | Constraints |
|---|---|---|
| Session identifier digest | Lookup value for opaque cookie credential | Cookie holds raw random identifier; database stores only its digest |
| Account reference | Account that owns the session | Foreign key to Account; disabled accounts cannot use sessions |
| Created timestamp | Session creation time | Server assigned; basis for absolute expiration |
| Last-seen timestamp | Last accepted request | Server updated; basis for idle expiration |
| Revoked timestamp/state | Whether session was ended | Logout revokes current session; deletion revokes all; password/role-change behavior follows D1/D5 |
| CSRF verifier/state | Binds synchronizer token to the authenticated browser session | Store only verifier material; reject absent, mismatched, expired, revoked, or wrong-session tokens. Bootstrap rotates the verifier without changing the authenticated session ID. |

Authenticated-session timeouts, cookie attributes, CSRF strategy, and role-change invalidation follow approved D1, D2, and D5. A session is accepted only after server-side state and current account status are checked.

## Anonymous CSRF Bootstrap Context

Represents a browser that has obtained a synchronizer token but has not authenticated. This is a separate persistence entity from `AuthSession` (approved D7:A); it never grants account access.

| Field | Meaning | Constraints |
|---|---|---|
| Context identifier digest | Lookup value for the opaque identifier in `__Host-dw_session` | Store only digest; rotate identifier on bootstrap replacement and login |
| CSRF token verifier | Verifies the synchronizer token returned by bootstrap | Store only verifier material; never log or return it |
| Created timestamp | Bootstrap context creation time | Server assigned; basis for 8-hour absolute expiry |
| Last-seen timestamp | Last accepted anonymous unsafe request/bootstrap use | Server updated; basis for 30-minute idle expiry |
| Revoked timestamp/state | Whether context is no longer valid | Revoke when replaced, expired, or consumed by successful login |

Anonymous contexts use the approved D1 limits of 30 minutes idle and 8 hours absolute. On login, revoke the anonymous context and create an authenticated `AuthSession` with a new identifier and new CSRF verifier. The browser cookie name/attributes remain those approved in D2.

## Relationships and State Transitions

- One Account has zero or more server-side sessions.
- Account lifecycle: `active → disabled`; disabled accounts cannot sign in and all their sessions are invalidated.
- Registration creates an active ordinary-user account only. Trusted role provisioning may change role; no self-service request may change role.
- Password change verifies current credentials, applies the accepted new-password policy, and changes the verifier. Resulting session invalidation follows D1.
- Under D4:B, email changes require current-password proof and remain unverified; this feature does not send verification email.
- Account deletion deactivates rather than physically deleting the identity in this feature. Product data retention belongs to the feature that owns that data.

## Validation and Privacy

- Registration requires name, unique email, password, and matching confirmation; role is server-assigned.
- Password acceptance follows FR-018. Verifier output is never returned or logged.
- Session cookie values and raw CSRF tokens are not logged or put in URLs, Redux, localStorage, or sessionStorage.
- Profile responses return only the current account's safe fields and never password verifier, session IDs, or private internal status.
- D4:B is settled: preserve the entered email spelling and compare trimmed addresses case-insensitively; the email remains unverified and no verification state is persisted. No further email-normalization or verification decision is open.
