# Feature Specification: Admin Management Dashboard

**Feature Branch**: `008-admin-management-dashboard`

**Created**: 2026-10-06

**Status**: Implementation in progress; browser-level verification remains incomplete

**Input**: User-provided Romanian requirements for a role-protected administration dashboard managing users, vehicles, and producers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access the admin dashboard (Priority: P1)

As an administrator, I want a dedicated dashboard for application records so that I can review and manage them from one protected area.

**Why this priority**: Authorized access and isolation are prerequisites for every dashboard capability.

**Independent Test**: Sign in as each existing role and as a visitor, request dashboard pages and data operations, and verify only an administrator can access them.

**Acceptance Scenarios**:

1. **Given** an authenticated account with the administrator role, **When** it opens `/admin`, **Then** it sees the Overview and can navigate to Users, Vehicles, and Producers in a dedicated admin layout.
2. **Given** an unauthenticated visitor, **When** it requests a dashboard page, **Then** it is denied and directed to the existing sign-in experience.
3. **Given** an authenticated ordinary user or producer, **When** it requests a dashboard page or protected dashboard data operation, **Then** access is denied and the user is directed to an appropriate existing page.
4. **Given** a non-administrator sends a direct request to read or change dashboard data, **When** the request is processed, **Then** the backend denies it without disclosing protected records or changing data.
5. **Given** a section has more records than fit on one page, **When** the administrator loads or changes pages, **Then** the table shows the selected subset and allows navigation through the remaining results.

### User Story 2 - Review users and deactivate an account (Priority: P1)

As an administrator, I want to inspect, filter, and sort user accounts and confirm before deactivating an account so that I can maintain account records deliberately.

**Why this priority**: User account administration is a requested dashboard capability, and deletion needs a clear safeguard.

**Independent Test**: With accounts present, filter and sort the user table, cancel a deletion, then confirm another deletion and verify the list and count update with a clear result.

**Acceptance Scenarios**:

1. **Given** user accounts exist, **When** the administrator opens Users, **Then** a table presents the available non-secret account details and account creation date.
2. **Given** a populated Users table, **When** the administrator combines filters and sorting for supported fields, **Then** the displayed rows match both criteria.
3. **Given** a user row, **When** the administrator chooses deactivate and cancels confirmation, **Then** the account remains unchanged.
4. **Given** a user row, **When** the administrator confirms deactivation, **Then** the account is disabled and its active sessions are revoked according to the existing account lifecycle, associated product data follows its owning feature's policy, and the table and relevant statistics refresh with a success or clear error message.

### User Story 3 - Review application vehicles (Priority: P1)

As an administrator, I want to inspect, filter, and sort vehicle records so that I can review the vehicles associated with the application.

**Why this priority**: Vehicle visibility is a core section of the requested dashboard, with deliberately read-only scope.

**Independent Test**: Open Vehicles, filter and sort by available vehicle fields, and verify no add, edit, or delete operation is offered or accepted through dashboard operations.

**Acceptance Scenarios**:

1. **Given** vehicles exist, **When** the administrator opens Vehicles, **Then** a table presents existing vehicle details.
2. **Given** a Vehicles table, **When** the administrator filters and sorts by available fields, **Then** both operations apply together.
3. **Given** a vehicle row, **When** the administrator uses dashboard operations, **Then** no vehicle create, update, or delete action is available or authorized.

### User Story 4 - Add and review producers (Priority: P1)

As an administrator, I want to review producer accounts and add a producer with login credentials so that the producer can sign in.

**Why this priority**: Producer provisioning is required to create accounts that can use the existing producer role.

**Independent Test**: Add a valid producer with a brand, verify the account appears without credentials exposed and can be filtered by brand, sign in with its email and password, and try invalid and duplicate emails to confirm clear errors.

**Acceptance Scenarios**:

1. **Given** the Producers section, **When** the administrator opens it, **Then** producer accounts appear in a table with available non-secret profile fields.
2. **Given** the add-producer form, **When** the administrator submits a name, brand, unique valid email, and valid password, **Then** a producer account is created with producer role and can authenticate using that email and password.
3. **Given** missing, malformed, or duplicate required values, **When** the administrator submits the form, **Then** the relevant validation error is shown and no partial account is created.
4. **Given** a producer account has been created, **When** its table, statistics, or confirmation is displayed, **Then** no password or credential-verification data is exposed.

### Edge Cases

- A dashboard table has no matching rows, is loading, or fails to load; each condition has a clear state and recoverable error handling.
- The administrator changes a filter, sort order, or page size while on a later page; the displayed page remains valid and totals/statistics remain correct.
- Filters return no rows, and combined filtering and sorting still produce consistent results.
- The underlying account or vehicle data changes while an administrator is viewing a table.
- Account deactivation fails; the account remains active and the administrator receives a clear safe error. Associated product records remain governed by the policy of the feature that owns them.
- A producer email conflicts with an existing account's sign-in identity, including simultaneous creation attempts.
- Producer credentials are invalid, the request is repeated, or account creation succeeds while the response is interrupted; no secrets are returned and the outcome can be safely recovered.
- Dashboard statistics update after user deactivation or producer creation and never count credentials as statistics.
- A non-administrator directly invokes any dashboard data operation regardless of visible interface controls.
- Tables remain readable and operable at supported screen widths and by keyboard and assistive technology.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated dashboard accessible only to the single authenticated account with the existing `admin` role. The administrator account MUST be provisioned outside the dashboard through a separate trusted script; the dashboard MUST NOT create additional administrator accounts.
- **FR-002**: The system MUST deny dashboard page and data access to unauthenticated visitors, ordinary users, and producers. It MUST direct denied page requests to the appropriate existing sign-in or application page.
- **FR-003**: The backend MUST authorize every dashboard read and mutation; hiding dashboard links or controls MUST NOT serve as authorization.
- **FR-004**: The dashboard MUST provide clear navigation among Users, Vehicles, and Producers and identify the active section.
- **FR-005**: Each section MUST present its total record count and a table of corresponding records. Users statistics MUST also show counts by account status; Vehicles statistics MUST show counts by propulsion type; Producers statistics MUST show counts by brand. Statistics MUST reflect persisted data and refresh after successful changes made by this dashboard.
- **FR-006**: Users MUST contain only ordinary `user` accounts and show available non-secret account fields, including name, email, status, and account creation date. The interface MUST filter by name, email, status, and creation date and sort by name, email, and creation date.
- **FR-007**: An administrator MUST be able to deactivate an ordinary user account only after explicit confirmation. Canceling MUST leave the account unchanged. A successful deactivation MUST prevent future authentication, revoke that account's active sessions, preserve associated product data according to the owning feature's policy, refresh relevant rows and statistics, and report the outcome clearly.
- **FR-008**: Vehicles MUST show available vehicle records and support combined filtering by name, model, type, year, range, mileage, and fuel type, and sorting by those fields and creation date. In this feature, administrators MUST NOT be able to create, update, or delete vehicles through the dashboard.
- **FR-009**: Producers MUST contain only producer-role accounts and support combined filtering by name, email, brand, status, and account creation date, and sorting by name, email, brand, and account creation date.
- **FR-010**: Public registration MUST continue to create ordinary `user` accounts. The sole administrator MUST be able to create producer accounts by supplying a non-empty name, a non-empty free-text brand, a valid unique email, and a password meeting the existing account password policy: at least 8 characters, including an uppercase letter, a number, and a special character. When validation fails, the form MUST show an English error beside each invalid field. A duplicate email MUST be identified on the email field. Validation MUST prevent partial account creation; errors MUST NOT expose internal details or secrets.
- **FR-011**: Producer creation MUST assign the existing `producer` role through the administrator-only operation. A successfully created producer MUST be able to authenticate using the existing email-and-password sign-in experience. No more than one active or disabled account may hold the `admin` role.
- **FR-012**: Passwords and other credential-verification data MUST NOT appear in tables, statistics, responses intended for display, or success/error messages. Password storage and authentication MUST reuse the existing secure credential lifecycle.
- **FR-013**: Dashboard tables MUST provide a labeled loading state, an empty state when the section has no records, a distinct no-matches state when filters exclude all records, and a clear error state with a retry action when loading fails. Successful mutations MUST show confirmation; failed mutations MUST show a clear safe error. Messages MUST NOT expose internal details or secrets.
- **FR-014**: Filters and sorting MUST be usable together in each applicable section. When filters yield no matching records, the section MUST distinguish that state from there being no records and provide a way to clear filters.
- **FR-015**: The dashboard MUST use a coherent, readable, responsive interface consistent with existing project UI conventions and provide accessible navigation, tables, forms, confirmations, and status feedback.
- **FR-016**: The system MUST NOT assume attributes absent from the current project. Producer brand is an explicitly requested profile field, MUST accept free text, and MUST be stored with producer profile data so it can be displayed and filtered. Vehicle filters MUST use only existing vehicle attributes; manufacturer filtering is outside this version because vehicles have no manufacturer field.
- **FR-017**: Each dashboard section MUST load and display records in pages and provide controls to move between available pages. Filters and sorting MUST apply across the full matching dataset before the selected page is returned; global section statistics MUST remain accurate across pages.
- **FR-018**: The admin area MUST have its own layout and navigation for Overview, Users, Vehicles, and Producers. It MUST NOT add a repeated Admin destination to the ordinary application navigation.
- **FR-019**: The Overview MUST show section totals and visual summaries derived from the existing dashboard statistics: user account status, vehicle type, and producer brand. Its section cards provide one link per section.
- **FR-020**: The admin area MUST offer a light/dark mode control. The selected mode MUST persist in the browser across admin routes and reloads.
- **FR-021**: Dashboard interface labels and messages MUST be in English. The Producers creation form MUST remain hidden until the administrator opens it with the Add producer action.

### Key Entities *(include if feature involves data)*

- **Account**: Existing account with `name`, `email`, `role`, `status`, and `created_at`; roles include `user`, `admin`, and `producer`. Credential verification data exists but is never dashboard display data.
- **Vehicle**: Existing vehicle with `name`, `model`, `type`, `year`, range, mileage, fuel type, ownership, and timestamps. No vehicle manufacturer/brand field currently exists.
- **Producer account**: An account whose role is `producer`, with a required free-text brand value collected at provisioning and available for producer listing and filtering. Authentication uses the account email and password.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested dashboard page and data requests by unauthenticated, ordinary-user, and producer accounts are denied; no protected record is disclosed or changed.
- **SC-002**: An authenticated administrator can reach each of the three sections from the dashboard navigation in one selection.
- **SC-003**: Administrators can apply a filter and sort together in each section using its defined fields, including producer brand, and results match the selected criteria.
- **SC-004**: A user account is deactivated only after confirmation; canceling leaves it unchanged, and a successful deactivation prevents further sign-in, revokes active sessions, and is reflected in the table and relevant statistics after the successful response.
- **SC-005**: A valid producer can be created and use the existing email-and-password sign-in experience; invalid and duplicate email submissions create no partial account and receive actionable feedback.
- **SC-006**: 100% of tested dashboard tables, statistics, and feedback messages expose no password or credential-verification data.
- **SC-007**: Users can identify loading, empty, and error states, and complete dashboard navigation and forms using keyboard controls in the responsive interface.
- **SC-008**: For every section with more records than one page, administrators can reach every matching record through page navigation; changing filters or sorting does not omit matching records or corrupt global statistics.
- **SC-009**: The admin layout provides Overview and the three management sections without adding an Admin link to the ordinary application navigation; each overview chart uses the corresponding returned statistics.
- **SC-010**: The selected light/dark mode remains selected when navigating between admin pages and after reloading the page.
- **SC-011**: Admin interface text is English, and producer fields are not visible until Add producer is activated.

## Assumptions

- Existing session authentication, role names, account status behavior, access-denial conventions, API response conventions, and secure password handling are reused.
- The single administrator is created by a separate trusted provisioning script; ordinary accounts come from public registration, and producer accounts come from the administrator-only dashboard workflow.
- User deletion follows the existing account lifecycle, which disables an account and invalidates its sessions; associated data behavior remains governed by the feature owning that data.
- Statistics are total record counts in each section, with Users additionally counted by active/disabled status, Vehicles by combustion/electric type, and Producers by brand.
- Filtering and sorting operate on the fields actually present in each record; absent fields require resolution rather than inferred data.
- Dashboard pages follow existing project UI conventions and backend-owned authorization rules documented in the project constitution.

## Clarifications

### Session 2026-10-06

- Q: Should the Users section contain only `user` accounts, with producer accounts kept in Producers and the administrator account kept out of both lists? → A: Yes. Public registration creates ordinary users; one administrator is provisioned by a separate trusted script; that administrator creates producers. The dashboard does not create additional administrators.
- Q: Which statistics should each dashboard section display? → A: Show the total in each section, Users by account status, Vehicles by propulsion type, and Producers by brand.
- Q: Should a producer's brand be free text or selected from a controlled list? → A: Free text, since the project has no existing brand catalog.

- **Q1 — Producer credentials and brand**: Resolved — producer accounts use the existing email-and-password sign-in. Brand is collected as producer profile data and is available as a filter in the Producers section.
- **Q2 — Vehicle manufacturer filter**: Resolved — vehicle filtering uses existing vehicle attributes; no manufacturer field is added to vehicles in this version. Brand filtering applies to producer records.




