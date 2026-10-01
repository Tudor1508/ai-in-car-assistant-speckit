# Feature Specification: Vehicle Management

**Feature Branch**: `006-vehicle-management`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: “Let's add a new feature called vehicle management. This feature will include a new page with user's vehicles. User can add, edit and delete their cars. a car can have name and model, type (combustion or electric), year, range, mileage, fuel type. There is a dedicated printscreen in docs/reference-ui/my_vehicles.png which you can inspire from. Also, add a navbar with all pages we have until now - design like in printscreen. Please update both backend and frontend specifically.”

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View my vehicles (Priority: P1)

As an authenticated user, I want to see my own vehicles and their key details so I can choose and maintain the cars I use.

**Why this priority**: A personal vehicle list is the core value of this feature and the starting point for all management actions.

**Independent Test**: Sign in as a user with saved vehicles and confirm that only that user's vehicles and all supported details are displayed; confirm the empty state offers a way to add a vehicle.

**Acceptance Scenarios**:

1. **Given** an authenticated user with saved vehicles, **When** they open My vehicles, **Then** each vehicle appears with its name, model, type, year, range, mileage, and fuel type where applicable.
2. **Given** an authenticated user with no vehicles, **When** they open My vehicles, **Then** they see an informative empty state and an Add vehicle action.
3. **Given** a user requests the vehicle page without an active authenticated session, **When** access is evaluated, **Then** the request is denied and the user is directed through the existing sign-in experience.

---

### User Story 2 - Add and edit my vehicles (Priority: P1)

As an authenticated user, I want to add a car and edit its details so my garage stays accurate.

**Why this priority**: Creating and maintaining vehicle records makes the list useful and ensures data remains current.

**Independent Test**: Add a valid combustion vehicle and a valid electric vehicle, then edit their details; verify the saved values appear in the user's list after each operation.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they submit a valid vehicle with the supported fields, **Then** it is saved to their account and appears in My vehicles.
2. **Given** a saved vehicle, **When** its owner edits valid fields and saves, **Then** the updated values are shown and persisted.
3. **Given** a form with missing or invalid values, **When** the user attempts to save, **Then** the invalid fields are identified in understandable language and no invalid record is saved.
4. **Given** a vehicle with a type selected, **When** the user enters its details, **Then** the form accepts combustion or electric and applies the applicable fuel information for that type.

---

### User Story 3 - Delete my vehicles (Priority: P2)

As an authenticated user, I want to remove a vehicle I no longer own so my garage stays relevant.

**Why this priority**: Deletion completes the expected lifecycle of a personal vehicle record.

**Independent Test**: Delete one of multiple vehicles and verify it no longer appears for its owner while the other vehicles remain unchanged.

**Acceptance Scenarios**:

1. **Given** an authenticated user with a saved vehicle, **When** they choose Delete and confirm, **Then** the vehicle is removed from their garage.
2. **Given** a delete confirmation, **When** the user cancels, **Then** the vehicle remains unchanged.
3. **Given** a user attempts to change or delete another user's vehicle, **When** the request is processed, **Then** access is denied and the other user's record remains unchanged.

---

### User Story 4 - Navigate between app pages (Priority: P2)

As an authenticated user, I want a consistent navigation bar for the app's available pages so I can move between them and recognize where I am.

**Why this priority**: Navigation makes the new page discoverable and preserves a coherent experience across existing pages.

**Independent Test**: Visit each currently available authenticated page using the shared navigation and verify the active page is clearly indicated and keyboard accessible.

**Acceptance Scenarios**:

1. **Given** an authenticated user on an app page, **When** they use the navigation bar, **Then** it shows links to the currently available app pages, including My vehicles, using the visual direction of `docs/reference-ui/my_vehicles.png`.
2. **Given** an authenticated user on a navigable page, **When** that page is current, **Then** its navigation item is identified as active visually and accessibly.
3. **Given** a visitor or signed-out user, **When** they view authentication pages, **Then** authenticated-only navigation actions are not presented as usable destinations.

### Edge Cases

- The garage list is empty or contains a single vehicle.
- The server is unavailable or a vehicle save, edit, list, or delete operation fails; the user receives a clear error and can retry without losing unrelated data.
- Two users attempt to access the same vehicle identifier; neither may read or alter another user's record.
- Year, range, or mileage is blank, malformed, negative, or outside the accepted boundary; invalid values are rejected with field-level guidance.
- Fuel type is not applicable to an electric vehicle; the interface and saved data make applicability clear without requiring a combustion-only value.
- A vehicle was deleted or changed elsewhere before an edit or delete is submitted; the user is told the record is no longer available and the list can be refreshed.
- The page is used at narrow screen widths or with keyboard navigation and assistive technology.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an authenticated My vehicles page that lists only vehicles owned by the signed-in user.
- **FR-002**: The system MUST allow an authenticated user to create a vehicle record containing a user-provided name and model, a type of combustion or electric, a year, a range, mileage, and fuel type when applicable.
- **FR-003**: The system MUST allow a vehicle owner to view and edit the supported details of their vehicle.
- **FR-004**: The system MUST allow a vehicle owner to delete a vehicle after an explicit confirmation and allow them to cancel that confirmation without changing the record.
- **FR-005**: The backend MUST validate submitted vehicle data and enforce ownership for listing, reading, creating, updating, and deleting vehicle records; client-side visibility MUST NOT be treated as authorization.
- **FR-006**: The frontend and backend MUST follow an explicit, documented contract for vehicle list and mutation requests, successful responses, and user-safe validation, authorization, not-found, and service errors.
- **FR-007**: The frontend MUST reflect successful create, edit, and delete operations in the shared vehicle state so all consuming components display a consistent list.
- **FR-008**: The My vehicles page MUST present loading, empty, success, and recoverable error states with accessible labels and understandable feedback.
- **FR-009**: The vehicle interface SHOULD follow the layout and visual direction of `docs/reference-ui/my_vehicles.png`, including a garage overview and clearly grouped per-vehicle details, while adapting to supported screen sizes.
- **FR-010**: The system MUST provide a consistent, accessible navigation bar across authenticated app pages, including a link to My vehicles and links to other currently available app pages; it MUST identify the current page. It MUST NOT create destinations for pages that are not otherwise part of the application.
- **FR-011**: Vehicle details MUST display units consistently for range and mileage. Electric vehicles MUST make clear that fuel type is not applicable when no combustion fuel is used.
- **FR-012**: The system MUST prevent invalid or incomplete vehicle data from being persisted and MUST explain validation failures in user-understandable terms.

### Key Entities

- **Vehicle**: A car owned by one user; has a name, model, propulsion type (combustion or electric), year, range, mileage, and applicable fuel type.
- **User**: The authenticated account that owns and may manage its vehicles. Vehicle ownership is enforced by the backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability checks, at least 90% of users can locate their vehicle list and identify the add action within 30 seconds.
- **SC-002**: At least 95% of users can complete a valid add or edit flow on the first attempt without assistance.
- **SC-003**: In authorization checks, 100% of attempts by one user to access or alter another user's vehicle are denied without changing the target record.
- **SC-004**: After a successful create, edit, or delete, the user's displayed list reflects the saved result within 2 seconds under normal connectivity.
- **SC-005**: Users can identify the current navigation destination and reach any currently available authenticated page from the shared navigation in no more than one selection.
- **SC-006**: The vehicle list and management actions remain usable at supported screen sizes and through keyboard-only navigation.

## Assumptions

- The existing authentication and role-protection behavior is reused; vehicle operations apply to the authenticated user's own garage for all account roles unless a later product feature explicitly grants broader access.
- A user's account may own multiple vehicles, and no product-defined maximum is imposed by this feature.
- Range and mileage are shown in kilometers, following the supplied reference screenshot; year is a valid calendar year no later than the current year.
- Fuel type applies to combustion vehicles. Electric vehicles may store no fuel type and show that field as not applicable; battery consumption metrics are outside this feature because they were not requested as vehicle data.
- Deleting a vehicle removes it from the user's garage; dependent trip-history behavior, if introduced by another feature, is governed by that feature's policy.
- The navigation bar links to authenticated pages already implemented in the application. It does not create trip-planning or trip-history pages solely because those labels appear in the reference screenshot if those pages are not yet available.
- Implementation uses the repository's established frontend/backend boundaries and approved stack; API shape, field boundaries, and validation rules will be resolved in the feature plan consistently with existing conventions.
