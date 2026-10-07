# Feature Specification: App-wide UX Polish

**Feature Branch**: `014-app-wide-ux-polish`  
**Created**: 2026-10-07  
**Status**: Draft  
**Input**: `C:\Users\butudor\Downloads\Note.txt` (25 requested interface and interaction refinements)

## User Scenarios & Testing

### User Story 1 - Navigate the public site and choose a readable theme (Priority: P1)

As a visitor, I want clear landing-page actions, useful footer navigation, and a consistent theme so I can find sign-in and public information on desktop or mobile.

**Independent Test**: Visit `/` signed out, follow its primary action, open each footer destination, and switch themes while moving between public and authenticated routes.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they activate “Start your journey,” **Then** they arrive at `/login`.
2. **Given** a visitor views the landing page, **When** they inspect the footer, **Then** they can identify navigation to Contact and Privacy pages and see only owner-approved contact/legal content. If the owner has not supplied a page's content, that page clearly states that its content is blocked until the owner provides it; the interface does not invent contact details or legal terms.
3. **Given** a visitor or signed-in user switches between light and dark mode, **When** they navigate between public, account, trip, vehicle, and admin pages or reload, **Then** the selected mode is consistently applied and remains selected; dark is used when no preference has yet been saved.
4. **Given** a visitor views “How it works” on a narrow or wide viewport, **When** they use keyboard or pointer input, **Then** the control is visibly interactive, has a clear focus state, and reaches its section.

### User Story 2 - Use polished authentication and profile screens (Priority: P1)

As an account holder, I want clear login, registration, and profile interactions so I can manage my account without duplicated controls or misleading editable fields.

**Independent Test**: Exercise login and registration success/failure, profile editing, role display, password change, deactivation, and sign-out while checking the approved backend account lifecycle remains unchanged.

**Acceptance Scenarios**:

1. **Given** a visitor opens login or registration, **When** they view or submit the form, **Then** its visual hierarchy, validation feedback, loading state, and keyboard/focus behavior are consistent with the application design system.
2. **Given** registration succeeds or the profile displays an email address, **When** the email is unverified, **Then** the interface does not display the “email not verified” notice, but the existing backend verification state and all behavior established by feature 005 remain unchanged.
3. **Given** an account holder opens My Profile, **When** they review their role, **Then** it is displayed as non-editable information rather than a selectable text input; profile APIs continue to reject attempts to change role through self-service.
4. **Given** an account holder opens My Profile, **When** they inspect account actions, **Then** there is one sign-out action in the shared navigation and no duplicate profile-level sign-out button.
5. **Given** a password change succeeds, **When** feature 005 revokes the current session, **Then** the client clears authenticated state and sends the user to `/` rather than the login page; a failed password change does not clear the session.
6. **Given** a user confirms account deactivation, **When** the existing feature 005 operation succeeds, **Then** active sessions remain revoked and the user is sent to `/`; failed or canceled deactivation does not change the account or clear a valid session.
7. **Given** an account holder signs out, **When** the operation succeeds or fails, **Then** the existing feature 009 behavior is preserved: success clears client authentication and returns to `/`, while failure retains the signed-in state and shows a safe error.

### User Story 3 - Manage favorites and review trip planning (Priority: P1)

As a signed-in driver, I want a compact favorites list, a clear fuel/battery selector, and understandable route stages so I can prepare and review a trip confidently.

**Independent Test**: Load more than two favorites, use and remove one, change current vehicle range, generate then stop a route request, and inspect the resulting ordered route stages.

**Acceptance Scenarios**:

1. **Given** the user has saved favorites, **When** the planner first displays them, **Then** at most two are shown and a “Show more” control reveals additional saved routes without pagination controls.
2. **Given** the user removes a favorite, **When** deletion succeeds, **Then** that favorite is removed from the authenticated owner’s list, the next saved favorite fills the vacated slot in the initial list when one exists, and the UI reports the result. The initial list shows at most two routes; “Show more” reveals the remaining saved routes. On failure, the favorite remains visible and the user can retry.
3. **Given** a user selects a vehicle and current fuel/battery level, **When** they open the current-level control, **Then** an accessible visual dashboard popup shows the selected percentage and an instrument needle corresponding to the estimated available range; changing the value updates both the needle and kilometer estimate. The existing percentage/range calculation and trip API meaning remain unchanged.
4. **Given** the current-level control uses a numeric input, **When** it is displayed, **Then** native increment/decrement spinner arrows are hidden; users can still change the value using an accessible keyboard-operable control and enter a valid percentage.
5. **Given** a route preview request is in progress, **When** the user activates “Stop,” **Then** the client cancels its wait for that request, restores the planning controls, and ignores any result that arrives after cancellation. A stale result never replaces a newer preview. The interface does not claim to have stopped backend/provider computation unless the existing request contract actually confirms cancellation.
6. **Given** an available route preview, **When** the user reviews its details, **Then** origin, destination, ordered legs, recommended stops, incomplete/unreachable status, and leg distances are presented in a clear hierarchy using only data returned by the route contract; route selection and feasibility behavior from features 007/010 are unchanged.

### User Story 4 - See the map before requesting a route (Priority: P2)

As a trip planner, I want the map area visible before I enter locations or generate a route so I can understand where route results will appear.

**Independent Test**: Open Trip Planning with no origin, destination, or preview, and verify that the map area has a useful empty state; then enter locations and preview a route to confirm the same map can show existing route results.

**Acceptance Scenarios**:

1. **Given** the trip planner opens before locations or a route are provided, **When** its content loads, **Then** the map area is visible with a clear empty state and does not fabricate a route, endpoints, stops, or user location.
2. **Given** a route preview later succeeds, **When** the preview is displayed, **Then** the map updates with the route and markers according to the existing trip/map contracts.
3. **Given** a map tile/provider failure, **When** the planner has no route or has a route preview, **Then** the page remains usable and displays a non-blocking map-area error/fallback consistent with existing map behavior.
4. **Given** the pre-route map is displayed, **When** the user views or operates it, **Then** it is informational only; selecting origin/destination by clicking the map is not part of this feature.

### User Story 5 - Manage vehicles with a clear, valid form (Priority: P1)

As a vehicle owner, I want one clear add action and a predictable vehicle form so I can enter or update my vehicle without duplicate actions or arbitrary validation.

**Independent Test**: View an empty and populated garage, create/edit vehicles with valid and invalid field values, and verify existing photo preview/upload behavior from feature 013 remains intact.

**Acceptance Scenarios**:

1. **Given** a user has no vehicles, **When** the garage displays its empty state, **Then** it presents one primary “Add vehicle” action rather than duplicating the action in both the empty state and page header.
2. **Given** a user opens Add or Edit Vehicle, **When** they provide values, **Then** validation applies to the appropriate existing fields and matches backend boundaries: required name/model, supported year, and non-negative whole-number range and mileage; no uppercase-only rule or new arbitrary validation is introduced.
3. **Given** a vehicle form has invalid values, **When** submission is attempted, **Then** the relevant fields identify the problem accessibly, no invalid partial update is saved, and the form remains usable.
4. **Given** a vehicle form is open, **When** the user previews, uploads, retains, or discards a vehicle image, **Then** feature 013 image precedence, ownership, licensing/attribution, fallback, and persistence behavior remain unchanged.
5. **Given** Add or Edit Vehicle opens in a dialog, **When** users view or operate it, **Then** its spacing, hierarchy, actions, errors, and small-screen layout are consistent with the application’s MUI patterns and are keyboard accessible.

### User Story 6 - Review and administer the dashboard (Priority: P2)

As the authorized administrator, I want recognizable branding, legible statistics, safe confirmations, and practical lists so I can manage existing records efficiently.

**Independent Test**: Sign in as admin and as non-admin roles; inspect branding/statistics, paginate long lists, cancel/confirm user and producer actions, and verify authorization and safe refresh/error behavior.

**Acceptance Scenarios**:

1. **Given** an administrator views any admin route, **When** the header renders, **Then** it includes the existing Drive Wise wordmark/brand treatment consistently with the public application; no unapproved external brand asset is invented.
2. **Given** the administrator views Overview or section totals, **When** they compare Users, Producers, and Vehicles, **Then** the summary cards use distinct accessible color accents while retaining the existing server-provided totals and charts; color is not the only way values/categories are distinguished.
3. **Given** an administrator views producers, **When** they choose Deactivate and confirm, **Then** the producer account is disabled, active sessions are revoked, associated data follows the owning features' policies, affected rows/statistics refresh after success, and safe errors are reported. Cancel leaves the record unchanged.
4. **Given** an administrator opens a destructive confirmation, **When** the dialog appears, **Then** it names the affected record and consequence, provides separate Cancel and explicit confirm actions, supports keyboard/focus handling, disables duplicate submission while pending, and announces safe success/failure feedback.
5. **Given** an admin list contains more rows than one page, **When** filters or sorting are applied and the administrator navigates pages, **Then** existing server-side pagination continues to expose all matching records and accurate global statistics. No new pagination is added to short lists solely for consistency.
6. **Given** a non-admin or unauthenticated user requests admin pages or data, **When** access is evaluated, **Then** the existing backend authorization denies access regardless of visible client controls.

### User Story 7 - Use the assistant and all pages on small screens (Priority: P2)

As a user, I want the assistant controls and existing pages to remain readable and operable on mobile so I can complete the same tasks on a narrow screen.

**Independent Test**: Visit every existing public and authenticated page at narrow and wide viewport sizes and operate the AI Concierge controls, forms, tables, navigation, dialogs, map, and pagination using keyboard and touch-sized controls.

**Acceptance Scenarios**:

1. **Given** the user opens AI Concierge, **When** they read messages or use Send, microphone, audio, Stop, and close controls, **Then** typography, spacing, control labels, focus, and contrast are polished while its scope, overlay behavior, voice consent, and audio Stop behavior from feature 011 remain unchanged.
2. **Given** any existing page is viewed at a supported narrow viewport, **When** the user navigates or performs its primary action, **Then** content does not become inaccessible through clipping/overlap, controls remain usable, and data remains available without horizontal scrolling except for intrinsically tabular content that has an accessible contained overflow treatment.
3. **Given** any page is viewed at desktop/tablet sizes, **When** content is displayed, **Then** existing information hierarchy and page behavior remain intact; responsive refinements do not introduce new product capabilities.

## Requirements

### Functional Requirements

- **FR-001**: The landing-page “Start your journey” action MUST navigate to the existing `/login` route. Existing login and registration routes and feature 009 sign-out behavior MUST remain available.
- **FR-002**: The public footer MUST provide links to separate Contact and Privacy pages. Those pages MUST use owner-supplied contact and legal content only. Until the project owner supplies a page's content, that page MUST clearly state that its content is blocked pending the owner's text; it MUST NOT display invented contact details, legal terms, or privacy claims.
- **FR-003**: Light/dark mode MUST be available across all existing public, authentication, account, vehicle, trip, AI Concierge, and admin pages. A user-selected mode MUST be shared across routes and persist across reloads. When no preference is saved, dark mode MUST be used across the app. Admin authorization and preference persistence from feature 008 MUST remain intact.
- **FR-004**: Landing “How it works” interaction MUST be discoverable, visibly interactive, keyboard operable, and have a visible focus state.
- **FR-005**: Login and registration experiences MUST receive visual and interaction polish consistent with the existing React/TypeScript, Redux, and MUI conventions, including accessible field errors, pending feedback, focus, and success/error hierarchy. Authentication rules and API contracts MUST NOT change.
- **FR-006**: The “email not verified” helper/alert copy MUST be removed from Register and My Profile. This MUST NOT change email verification state, backend response fields, account access, or any approved behavior in feature 005.
- **FR-007**: My Profile MUST show account role as labeled, read-only information, not as a focusable/editable form control. Backend role authorization and profile update allowlists remain authoritative.
- **FR-008**: My Profile MUST NOT duplicate the shared navigation sign-out action. Existing successful/failed sign-out semantics MUST remain unchanged.
- **FR-009**: After a successful password change or self-service account deactivation, the client MUST preserve feature 005 backend session revocation and account-disable behavior, clear client authentication as currently required, and navigate to `/`. Failure or cancellation MUST NOT falsely report success or discard a still-valid session.
- **FR-010**: Favorite routes MUST initially display no more than two saved entries and provide “Show more” to reveal additional entries. When the list is collapsed, deleting one of the visible routes MUST immediately fill its slot with the next saved route in stable list order, if one exists. If fewer than two saved routes remain, show all remaining routes. This short list MUST NOT use page-number pagination.
- **FR-011**: Favorite routes MUST provide an owner-scoped remove operation with explicit safe loading/success/error behavior. The backend MUST authorize ownership for deletion, retain existing authentication/CSRF/API envelope conventions, and MUST NOT allow one account to remove another account’s route. After successful removal, the visible list MUST follow FR-010; after failure, the item MUST remain available for retry.
- **FR-012**: The selected vehicle’s current fuel/battery percentage control MUST offer an accessible visual dashboard popup with a needle tied to the current percentage and displayed estimated kilometers, while preserving the existing `range_km × percentage` estimate and API meaning. Numeric spinner arrows MUST be hidden; the percentage MUST remain keyboard operable and bounded by existing validation.
- **FR-013**: A Stop control MUST be available only while a trip preview request is pending. It MUST cancel the client’s wait for that request and invalidate/ignore its eventual result so a canceled/stale request cannot overwrite a later preview. It MUST restore the planner controls and MUST NOT affect saved trips/favorites, route algorithms, or AI audio Stop behavior. It MUST NOT claim provider-side work stopped unless the current contract confirms that.
- **FR-014**: Route details MUST present the existing origin, destination, ordered route legs, recommended stops, per-leg distances, and incomplete-feasibility information with a clear visual hierarchy. The feature MUST NOT change route choice, routing, stop recommendation, or autonomy calculations defined by features 007 and 010.
- **FR-015**: The trip planner MUST show its map region before locations or route geometry exist, with a non-fabricated empty state. Existing map/provider attribution, route geometry, map failure handling, and preview behavior MUST be retained. The pre-route map is informational only; locations continue to be entered using existing controls.
- **FR-016**: The admin header MUST show the existing application wordmark/brand treatment on all admin routes without introducing a new third-party brand asset or changing admin access.
- **FR-017**: Admin summary statistics for users, producers, and vehicles MUST receive distinct accessible visual accents while retaining server-sourced values and current chart groupings. Meaning MUST NOT be communicated through color alone.
- **FR-018**: Admins MUST be able to deactivate a producer only after explicit confirmation. Deactivation MUST disable the producer account and revoke its active sessions, preserve associated product data according to each owning feature's policy, refresh affected rows/statistics on success, and report safe errors. The backend MUST enforce admin authorization.
- **FR-019**: Destructive confirmation dialogs MUST clearly identify the target and consequence, separate cancel from confirm, support keyboard/focus access, prevent duplicate pending submissions, and provide safe outcome feedback. Existing deletion/deactivation lifecycle semantics MUST NOT be silently changed.
- **FR-020**: Pagination MUST be checked and preserved where lists can exceed one page. Existing admin server pagination and Trip History pagination MUST remain correct; short collections such as favorites MUST use the specified “Show more” behavior instead of unnecessary page controls.
- **FR-021**: All existing pages MUST remain responsive and accessible at supported narrow and wide viewports. Tables MAY use contained horizontal scrolling when needed, but page-level layout MUST remain operable and key actions visible.
- **FR-022**: When the garage is empty, it MUST expose one primary Add vehicle action, not duplicate the header and empty-state actions.
- **FR-023**: Vehicle add/edit validation MUST align with existing backend and frontend field rules, reject negative range/mileage and other invalid values on the appropriate fields, and MUST NOT impose uppercase-only values or arbitrary new constraints. Form UI MUST be polished and accessible.
- **FR-024**: Shared logout actions MUST have a consistent, discoverable visual treatment across public/account/admin shells without adding duplicate sign-out controls or changing logout request semantics.
- **FR-025**: AI Concierge typography, buttons, spacing, and responsive behavior MUST be polished without changing its approved feature 011 scope, provider disclosure, overlay placement, voice control, or interaction/API contract.
- **FR-026**: The feature MUST use existing project technologies, component patterns, contracts, and data. It MUST NOT add unrequested product capabilities, external services, dependencies, or modify route/autonomy business behavior.
- **FR-027**: All protected reads and mutations MUST preserve backend-enforced role/ownership authorization. UI hiding, disabling, or navigation rules MUST NOT be treated as authorization.
- **FR-028**: All changed controls and feedback MUST have accessible names, keyboard operation, visible focus, understandable loading/error states, and responsive presentation consistent with the constitution.

## Traceability: Note.txt Items

| Note item | Request | Requirement / story | Verifiable acceptance |
|---:|---|---|---|
| 1 | Start your journey opens Login, not Register | FR-001, US1 | US1 scenario 1 |
| 2 | Footer, contact/privacy and separate pages | FR-002, US1 | US1 scenario 2 |
| 3 | Light/dark across all pages | FR-003, US1 | US1 scenario 3 |
| 4 | Polish Login/Register | FR-005, US2 | US2 scenario 1 |
| 5 | Remove favorites; show two plus Show more | FR-010–011, US3 | US3 scenarios 1–2; collapsed list refills the removed slot from the next saved route |
| 6 | Fuel popup/gauge or remove +/- | FR-012, US3 | US3 scenarios 3–4 |
| 7 | Stop after Generate route | FR-013, US3 | US3 scenario 5; cancellation intent clarified by user |
| 8 | Improve route stages/stops details | FR-014, US3 | US3 scenario 6 |
| 9 | Show map before locations/route | FR-015, US4 | US4 scenarios 1–4 |
| 10 | Add logo to admin dashboard | FR-016, US6 | US6 scenario 1 |
| 11 | Add color to admin user/producer/car stats | FR-017, US6 | US6 scenario 2 |
| 12 | Deactivate producer | FR-018, US6 | US6 scenario 3 |
| 13 | Polish delete/deactivate confirmations | FR-019, US6 | US6 scenario 4 |
| 14 | Check pagination where appropriate | FR-020, US6 | US6 scenario 5 |
| 15 | Mobile responsive on all pages | FR-021, US7 | US7 scenarios 2–3 |
| 16 | Avoid duplicate Add vehicle when garage empty | FR-022, US5 | US5 scenario 1 |
| 17 | Remove “email not verified” notice from Profile/Register | FR-006, US2 | US2 scenario 2 |
| 18 | Remove duplicate profile sign-out | FR-008, US2 | US2 scenario 4 |
| 19 | Password change redirects to landing | FR-009, US2 | US2 scenario 5 |
| 20 | Show profile role as non-editable info | FR-007, US2 | US2 scenario 3 |
| 21 | Validate vehicle fields, polish dialog | FR-023, US5 | US5 scenarios 2–3, 5 |
| 22 | Make How it works look clickable | FR-004, US1 | US1 scenario 4 |
| 23 | Polish logout buttons everywhere | FR-024, US2 | US2 scenario 7 |
| 24 | Polish AIChat controls and text | FR-025, US7 | US7 scenario 1 |
| 25 | Deactivation redirects to landing | FR-009, US2 | US2 scenario 6 |

## Existing Behavior and Contradictions

- Feature 009 makes `/` the public landing page, provides `/login` and `/register`, and already requires successful sign-out to clear client auth and return to `/`. Item 1 changes the landing CTA destination; items 19 and 25 align successful account lifecycle navigation with the existing public landing route.
- Feature 009 explicitly lists a public landing theme switch as out of scope. Feature 008 provides a light/dark switch only in the admin area, persisted across admin pages/reloads. FR-003 intentionally extends theme availability and shared preference across the whole application; the selected preference is shared app-wide and dark is the default before a preference is saved.
- Feature 005 defines profile access to show the account role, restricts self-service role changes, and establishes password change/account deactivation session behavior. Removing email-status copy is presentation-only; it does not approve or imply email verification/delivery functionality. Redirect changes in FR-009 must preserve the existing backend session revocation and account disablement.
- Feature 008 currently permits producer creation and listing but defines deactivation only for ordinary users. Adding producer deactivation is a new admin mutation; its approved effect is the existing user deactivation lifecycle (disable account, revoke active sessions, preserve associated product data under owner-feature policies), never hard deletion.
- Feature 007 displays route details and favorite routes; the current favorites API supports listing and saving only. Owner-scoped deletion and client cancellation are new contracts. Feature 010 adds route-choice/stop recommendation behavior that this feature preserves.
- Feature 011 already uses “Stop” for assistant audio playback and closing the chat stops audio/voice activity. Route-generation Stop is a separate control and MUST NOT alter assistant audio behavior.
- Feature 013 now defines owner-uploaded vehicle photos that take precedence until explicitly discarded. Vehicle dialog polish MUST preserve this rule and all current image licensing, attribution, and ownership requirements.
- Existing admin lists and Trip History already have server pagination. This feature audits their usability and preserves them; it does not add pagination to lists that do not need it.

## Clarification Outcomes (2026-10-07)

- **OQ-1 — Favorite list after removal: resolved.** When a favorite in the collapsed initial list is deleted successfully, the next saved favorite in stable list order immediately fills the open slot. The collapsed list continues to show at most two saved routes; “Show more” exposes the rest. If fewer than two remain, show every remaining route. A failed deletion leaves the item in place and available for retry.
- **OQ-2 — Contact and Privacy content owner: resolved.** The project owner supplies both pages' content. Until the relevant text/details are supplied, each page's content is blocked and the page must state that it is awaiting owner-provided content. Do not invent contact details, legal wording, privacy promises, or substitute generic claims. Routes and footer links may exist while content is blocked.

## Assumptions

- The interface language and existing route paths remain English/current project conventions unless an existing page contract specifies otherwise.
- The new Contact and Privacy routes use conventional `/contact` and `/privacy` paths unless current routing conventions require a compatible alternative. The project owner supplies their content; until then, each page remains clearly marked as content-blocked.
- “Light/night mode” means existing MUI light/dark themes. Dark is the initial app-wide mode until the user saves a preference. Shared persistence does not introduce a UI framework, dependency, or external service beyond project-declared tools.
- “Cars” in admin statistics refers to the existing Vehicles section and the current propulsion-type counts. This does not add manufacturer fields or new statistics.
- A valid Stop action can cancel the browser’s pending wait and ignore stale results. It cannot promise that synchronous server/provider work has ceased unless the existing API contract supports that guarantee.
- Existing route map behavior before results may be represented by an informational empty state in the existing map area; it does not imply fabricated coordinates or click-to-select support.
- The current vehicle validators and backend remain authoritative. The feature does not add constraints beyond current domain rules and the explicit no-negative-value request.

## Scope Boundaries

- No change to trip routing, route recommendation, scenic attraction spacing, vehicle autonomy, range calculations, trip history persistence, or AI travel-answer behavior.
- No change to authentication, email verification, role assignment, backend account disablement/session revocation, or ownership policy established in features 005 and 008.
- No invented contact details, legal/privacy text, brand identity, vehicle data, map data, or route results.
- No new service, provider, technology stack, or dependency.
- No hard deletion of producers, favorites, accounts, vehicles, or route history unless an approved existing contract already defines it.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 25 Note.txt requests map to at least one FR and one testable acceptance scenario in the traceability table.
- **SC-002**: The landing primary action routes to `/login`; Contact/Privacy links resolve to separate pages and display no fabricated contact/legal content.
- **SC-003**: After setting a theme, 100% of tested existing routes display the same selected theme after navigation and reload.
- **SC-004**: A user can identify and use all first two favorites, reveal more, and remove a favorite without another account’s data being exposed; after a successful deletion from the collapsed list, the next saved favorite fills the open slot when one exists, while no more than two remain visible until “Show more” is activated.
- **SC-005**: The range popup needle and displayed available kilometers correspond to the same selected percentage and saved range in all tested values, including minimum and maximum.
- **SC-006**: A canceled route preview cannot alter the selected/current preview after a later request completes.
- **SC-007**: 100% of tested page, API, and mutation attempts preserve existing backend authorization and ownership decisions.
- **SC-008**: Every existing paginated admin list remains navigable to every matching record across its supported filters and sorting. Trip History pagination and sorting remain correct and its global summary remains accurate; no Trip History filters are added. No unnecessary pagination is introduced for favorites.
- **SC-009**: All pages and primary actions are usable at the project’s supported mobile and desktop viewports with keyboard access, visible focus, and no obstructive overlap.
- **SC-010**: Vehicle validation and image upload/precedence, auth/session semantics, and route/autonomy outcomes remain unchanged except for the explicitly specified presentation/navigation improvements.
