# Feature Specification: Authentication and Roles

**Feature Branch**: `005-auth-and-roles`

**Created**: 2026-10-01

**Status**: Clarification and plan decisions approved; implementation complete

**Input**: User description: Specify registration, authentication, logout, profile management, and role-protected access for ordinary users, administrators, and producers. Use the legacy README and supplied screenshots as references, not as automatic product or technology approvals.

## Clarifications

### Session 2026-10-01

- Q: How will administrator and producer accounts be created without privileged self-enrollment or adding a dashboard to this feature? → A: A trusted operator provisions or promotes privileged accounts through a process outside public registration.
- Q: In this feature, what operations may ordinary users, administrators, and producers perform on their own and other accounts? → A: All three roles may manage only their own profile and password; no role may read or change another account's profile, credentials, or role in this feature. Later product operations define their permissions in their own feature specifications.
- Q: What authentication and session mechanism should this web application use? → A: Email and password authentication with a server-managed session represented by a secure cookie; logout invalidates the current session.
- Q: For registration and password changes, what rules should apply to a new password and what verification should the account holder complete? → A: Require the current password and confirmation of the new password when changing it; apply the legacy screenshot's password rule to registration and password changes: at least 8 characters, one uppercase letter, one number, and one special character.
- Q: Should self-service account deletion be part of this feature, and what confirmation and handling of associated data should it require? → A: Include self-service deletion, require the current password and explicit confirmation, disable the account, and apply the owning feature's policy to associated data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an ordinary account (Priority: P1)

As a new driver, I want to create an account with my personal details so I can use Drive Wise as an authenticated user.

**Why this priority**: Registration is an entry point to the protected account experience.

**Independent Test**: Submit valid and invalid registration details and verify account creation, safe validation feedback, and the role assigned to a new account.

**Acceptance Scenarios**:

1. **Given** a visitor on registration, **When** they submit valid required details for an available email address, **Then** an account is created and the user receives a clear success outcome.
2. **Given** a visitor submits invalid, incomplete, or already-used account details, **When** registration is processed, **Then** no duplicate or partial account is created and a clear field-level or form-level error is shown.
3. **Given** a visitor selects or submits a privileged role during self-registration, **When** the request is processed, **Then** the visitor cannot obtain administrator or producer privileges through self-enrollment.
4. **Given** registration succeeds, **When** the assigned account role is determined, **Then** it follows the role assignment policy confirmed for this feature.

---

### User Story 2 - Sign in and sign out (Priority: P1)

As a registered user, administrator, or producer, I want to sign in and sign out so that I can access my authorized account experience and end my active access.

**Why this priority**: Every protected account action depends on establishing and ending a recognized identity.

**Independent Test**: Verify successful and unsuccessful sign-in, access while signed in, logout, and denial of protected access after logout according to the approved session policy.

**Acceptance Scenarios**:

1. **Given** an active account and valid credentials, **When** its owner signs in, **Then** the owner is authenticated and sees a success outcome without exposure of credentials or secrets.
2. **Given** an unknown account or invalid credentials, **When** a visitor attempts sign-in, **Then** access is denied with a safe message that does not reveal sensitive account or system details.
3. **Given** an authenticated account, **When** its owner signs out, **Then** the active access is ended according to the approved session policy and subsequent protected requests are denied until authentication succeeds again.
4. **Given** an unauthenticated visitor, **When** they try to access protected account information or operations, **Then** the backend denies the request regardless of what the interface displays.

---

### User Story 3 - Manage personal profile and account (Priority: P2)

As an authenticated account holder, I want to view and manage my own profile and credentials so that my account remains accurate and under my control.

**Why this priority**: People need to review and maintain the identity information associated with their account.

**Independent Test**: View a profile, update permitted personal details, change the password, and request account deletion; verify that accepted changes take effect and that a disabled account can no longer sign in.

**Acceptance Scenarios**:

1. **Given** an authenticated account, **When** its owner opens the profile, **Then** the owner can see their own name, email address, and account role, and cannot see another account's private profile data.
2. **Given** an authenticated account, **When** its owner submits valid changes to editable profile details, **Then** the changes are saved and the updated values are displayed.
3. **Given** an authenticated account, **When** its owner submits invalid profile details, **Then** changes are not partially applied and a safe, understandable validation message is shown.
4. **Given** an authenticated account, **When** its owner submits the correct current password and a matching new-password confirmation that meets the approved password rule, **Then** the password is changed.
5. **Given** a request to change credentials or profile data, **When** the requester is not authorized for that account, **Then** the request is denied by the backend.
6. **Given** an account holder requests deletion of their own account, **When** they provide the correct current password and explicitly confirm, **Then** the account is disabled, the user is informed, and the account can no longer authenticate.
7. **Given** a deletion request lacks the correct current password or explicit confirmation, **When** it is processed, **Then** the account remains active and no associated data is changed.

---

### User Story 4 - Enforce role-protected access (Priority: P1)

As a user of Drive Wise, I want access to protected operations to follow my assigned role so that sensitive capabilities are available only to authorized accounts.

**Why this priority**: The backend must enforce access controls for ordinary users, administrators, and producers consistently with the constitution.

**Independent Test**: For each agreed protected operation, exercise allowed and denied requests as an unauthenticated visitor and as each of the three roles; verify that the backend decision matches the approved role policy.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request to a protected operation, **When** the backend evaluates it, **Then** it denies access.
2. **Given** an authenticated account with a role not authorized for an operation, **When** it requests that operation, **Then** the backend denies access even if the client presents or enables the corresponding control.
3. **Given** an authenticated account with a role authorized for an operation, **When** it requests that operation, **Then** the backend permits the request subject to the operation's other requirements.
4. **Given** an administrator or producer account, **When** it requests an operation outside its confirmed permissions, **Then** the backend denies access.

### Edge Cases

- Two registration requests attempt to create accounts with the same email address at nearly the same time.
- A profile email change conflicts with another account or requires proof of control of the new address.
- A password-change request has missing or incorrect current credentials, mismatched confirmation, or violates the confirmed password policy; the change is rejected without altering the password.
- A sign-in or profile request uses an expired, revoked, or otherwise invalid authentication state.
- A user signs out in one client while another session remains active; logout invalidates the current session only, while account deletion invalidates all active sessions.
- An account's role changes while it has an active session; the implementation plan must specify when the new role takes effect for that session.
- A registration request includes an unknown, forged, or privileged role value.
- Profile or authentication failures occur; user-facing errors must not expose secrets, stored credential material, internal exceptions, or whether sensitive account state exists beyond the approved disclosure policy.
- Account deletion is requested while other data is associated with that account; each feature that owns associated data determines its deletion, anonymization, or retention behavior.
- A disabled account attempts to sign in or reuse an existing session; the backend denies access.
- A role attempts to access an operation for which the permission matrix has not granted access; default-deny applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a registration experience that collects the person's name, email address, password, and password confirmation and reports success or actionable validation errors; it MUST reject a mismatched password confirmation.
- **FR-002**: The system MUST prevent registration from granting administrator or producer privileges solely by a role value supplied by the registering person.
- **FR-003**: The system MUST authenticate an existing account using its email address and password and deny invalid attempts with safe user-facing feedback.
- **FR-004**: The system MUST represent authenticated access with a server-managed session in a secure cookie; logout MUST invalidate the current session so subsequent protected requests using it are denied.
- **FR-005**: The system MUST provide an authenticated account holder access to their own profile information, including the account role, while preventing access to another account's private profile through self-service operations.
- **FR-006**: The system MUST validate profile updates at the backend boundary, apply only permitted fields, and avoid partial updates when validation fails.
- **FR-007**: The system MUST allow an authenticated account holder to change their own password only after verifying the current password and confirming the new password; mismatched or invalid submissions MUST be rejected without changing the credential.
- **FR-008**: The system MUST enforce authorization on the backend for every protected operation according to an explicit permission matrix for ordinary users, administrators, and producers; interface visibility MUST NOT count as authorization.
- **FR-009**: The system MUST deny access by default when a role is not explicitly authorized for a protected operation.
- **FR-010**: Authentication, profile, and authorization errors MUST follow the common API response and error conventions approved in feature 004, return only safe messages and details, and never disclose secrets or internal error information. The existing `/health` response MUST remain unchanged.
- **FR-011**: The system MUST persist account identity, credential-verification material, role, profile information, and any state required by the approved authentication/session policy using the persistence conventions approved for feature 004.
- **FR-012**: The system MUST apply a unique-account identity rule to the approved sign-in identifier and prevent duplicate identities, including concurrent registration attempts.
- **FR-013**: The user experience MUST provide clearly labeled registration, sign-in, profile, password-change, account-deletion, and logout actions and communicate validation and failure states accessibly.
- **FR-014**: An authenticated account holder MUST be able to request deletion of their own account by providing the current password and explicit confirmation. The system MUST then disable the account, prevent future authentication, and invalidate its active sessions. Associated data MUST follow the retention/deletion policy of the feature that owns that data; this feature MUST NOT invent a product-data retention policy.
- **FR-015**: Public registration MUST assign the ordinary-user role. Administrator and producer roles MUST be assigned or changed only through a trusted provisioning process outside public self-registration; a registering person MUST NOT be able to grant themselves a privileged role. The process and permissions are specified by FR-016.
- **FR-016**: Within this feature, ordinary users, administrators, and producers MUST be able to access and manage only their own profile and password; no role may read or change another account's profile, credentials, or role. Future product operations MUST define their own role permissions in their respective feature specifications. Before implementation, the plan MUST specify when a trusted role change takes effect for active sessions.
- **FR-017**: The authentication lifecycle MUST protect credential-verification material and use email/password with a server-managed session represented by a secure cookie; logout invalidates the current session. Before implementation, the implementation plan MUST explicitly resolve session expiration, cookie security attributes and cross-site request protection, the credential-verification method, and whether email ownership must be verified for registration or address changes. Any email-delivery integration requires a separate scope decision and is not approved by this feature. Password recovery is outside this feature unless separately approved; JWT and Argon2 remain unapproved absent an explicit plan decision.
- **FR-018**: Registration and password changes MUST accept only passwords of at least 8 characters containing at least one uppercase letter, one number, and one special character; the system MUST state these requirements and identify unmet conditions accessibly.

### Key Entities *(include if feature involves data)*

- **Account**: An identity that can authenticate and has one assigned role; includes the approved sign-in identifier, profile details, account state, and credential-verification material without exposing secrets.
- **Role**: One of ordinary user, administrator, or producer. In this feature, each role permits only self-service access to its own profile and password; permissions for other operations are defined by the features that introduce them.
- **Authentication state**: A server-managed account session represented by a secure cookie; its expiration policy remains to be confirmed.
- **Profile**: The account holder's own user-visible details, such as name and email address, subject to confirmed editability and verification rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can complete valid registration and receive a clear outcome in one uninterrupted flow.
- **SC-002**: A valid account holder can sign in and sign out; after logout, protected requests using the ended authentication state are denied in 100% of tested cases.
- **SC-003**: 100% of tested profile read and update attempts prevent one account from accessing or changing another account's private profile through self-service operations.
- **SC-004**: 100% of tested role/operation combinations match the confirmed permission matrix, including denial of unauthenticated and unassigned access.
- **SC-005**: 100% of tested invalid registration, sign-in, profile, and credential-change inputs produce safe, understandable errors and do not partially apply invalid changes.
- **SC-006**: No tested authentication or profile response exposes plaintext credentials, credential-verification material, secrets, or internal exception details.
- **SC-007**: At supported screen sizes, the registration, sign-in, and profile account flows expose labeled, keyboard-operable controls and an understandable status for success and failure.
- **SC-008**: 100% of account deletion requests without the correct current password and explicit confirmation leave the account active; confirmed requests disable the account and deny subsequent authentication.

## Assumptions

- The constitution's Python backend owns authoritative identity, credential validation, protected account operations, and authorization; frontend controls are not an access-control boundary.
- Feature 003 establishes the existing backend root and technical `GET /health` contract; this feature preserves that response.
- Feature 004's approved plan and contract artifacts establish HTTP/JSON, FastAPI-generated OpenAPI 3.1, a `data` success envelope for future API responses, the shared `error` shape (`code`, safe `message`, optional `details` and `request_id`), HTTP 422 for invalid input, generic HTTP 500 errors, HTTP 404/405 using the same error envelope, and compatibility by default. Authentication and profile contracts in this feature must follow those conventions; `/health` remains unchanged.
- Feature 004's approved local persistence foundation does not itself define a production database or this feature's identity lifecycle. Any storage details must follow the approved 004 plan and the authentication decisions made for this feature.
- Sign-in uses an email address and password, as explicitly confirmed during clarification; the legacy screen was a reference, not approval by itself.
- Login, registration, and profile screenshots and the old README describe legacy behavior only. The password rule and account-deletion flow included here are explicit owner approvals; JWT, Argon2, and legacy role/dashboard behavior are not approved by their appearance in legacy materials.
- The feature covers registration, authentication, logout, account role assignment/enforcement, and an account holder's own profile/credential management only. It does not add role dashboards, vehicle management, trip planning, route history, producer reports, administrator management screens, or external integrations.
- Profile self-service is limited to the account holder's own account unless an explicit permission matrix confirms additional operations.

## Out of Scope

- Administrator or producer dashboards, reports, statistics, and management screens.
- Vehicle management, trip planning, route history, saved routes, or any other product workflow.
- Defining permissions for product operations that are not part of this feature, except recording them in the role matrix when their scope is explicitly approved.
- External identity providers, email delivery, or other external integrations unless separately approved.
- Forgotten-password and account-recovery flows.
- Email verification or email-delivery integrations; these require an explicit scope decision if the plan determines verification is required.
- Selecting authentication/token technology or credential-hashing algorithms based solely on the legacy README.
