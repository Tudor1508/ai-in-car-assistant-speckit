# Proposed UI Contract: Authentication and Profile

**Status**: Approved UI contract implemented. The legacy screenshots at [login.png](../../../docs/reference-ui/login.png), [register.png](../../../docs/reference-ui/register.png), and [profile.png](../../../docs/reference-ui/profile.png) were used as visual references, not authority for unrelated product navigation.

## Sign-In

- Route: `/login`.
- Show labeled email and password fields, a primary Sign in action, and a Create account link, following the supplied `login.png` card composition.
- Keep password input transient and never store it in Redux, browser storage, logs, or API error state.
- Show a generic form-level authentication failure that does not reveal whether the email exists, is disabled, or has an incorrect password.
- Do not show password recovery; that flow is out of scope.

## Registration

- Route: `/register`.
- Show name, email, password, and confirm-password fields; display the approved password requirements alongside the password field as shown in `register.png`.
- Do not show a role selector or any way to request administrator/producer status.
- Show field/form errors next to the corresponding control and retain non-secret inputs after validation failure. Clear password inputs after successful submit.
- On success, confirm account creation and offer Sign in. Proposed contract does not auto-authenticate after registration.

## Profile

- Route: `/profile`; requires an active session. Redirect or present sign-in when unauthenticated; backend still enforces access.
- Show the current account's name, email with a visible “Neverificat” status, and role, with no navigation to admin/producer dashboards, vehicles, routes, or history. The unverified label communicates D4:B; it does not offer verification or imply a delivery flow.
- Provide self-profile edit, change-password, account-delete, and logout actions. Role is read-only.
- Password-change form requires current password, new password, and confirmation, showing the approved rule.
- Account-delete action opens an explicit confirmation dialog and requires current password before submission. On success, clear client auth state and route to sign-in/public landing; disabled account cannot log in.

## Visual and Accessibility Direction

- Use the current MUI 9 controls and Next App Router conventions; screenshots show a dark navy surface with cyan accent and centered auth cards. Translate these as references using the project's MUI theme rather than adding a separate component library.
- At narrow and wide viewport sizes, forms remain readable and operable without horizontal scrolling. Every field has a visible label, error text is associated with its field, actions are keyboard operable, and dialog focus is managed.
- Profile screenshot contains navigation to product areas that are out of scope; those links are omitted from this feature.
- Shared authentication status/profile summary may live in Redux. Passwords, session cookie values, and CSRF secrets must not be persisted there. The HttpOnly session cookie is not read by frontend JavaScript.
- Before anonymous registration/login and authenticated mutations, the shared API client calls `POST /auth/csrf/bootstrap` as needed, holds the raw token in memory only, and sends it in `X-CSRF-Token`. A successful login replaces the anonymous cookie identifier and token with the new authenticated session cookie and session-bound token returned by the login response. It never places the token in Redux or browser storage.
