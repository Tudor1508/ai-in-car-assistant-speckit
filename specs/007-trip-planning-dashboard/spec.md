# Feature Specification: Trip Planning Dashboard

**Feature Branch**: `007-trip-planning-dashboard`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Build the main signed-in trip-planning dashboard where a user enters a start and destination, selects one of their vehicles and its available range, previews a route on a map with distance and estimated travel time, and saves and revisits favorite routes. Use the OpenRouteService mapping service, keep the interface attractive and easy to use, preserve existing functionality, and do not hardcode configuration values."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan and preview a trip (Priority: P1)

As a signed-in user, I want to enter where I am leaving from and where I am going, choose one of my vehicles, and see a mapped route with its distance and estimated travel time so I can review my trip.

**Why this priority**: Route planning is the central purpose of the dashboard and delivers the primary value of this feature.

**Independent Test**: Sign in as a user with at least one vehicle, enter two valid locations, select the vehicle and its available range, and verify a route, distance, and estimated time are presented.

**Acceptance Scenarios**:

1. **Given** a signed-in user with at least one vehicle, **When** they provide a valid origin and destination, select a vehicle and its available range, and request a preview, **Then** the route is displayed on the map with distance and estimated travel time.
2. **Given** a route request with an invalid or unresolved location, **When** the user requests a preview, **Then** the user receives clear guidance and their other entered trip details remain available to correct.
3. **Given** the routing service is unavailable or rejects a request, **When** the user requests a preview, **Then** the dashboard explains that the route could not be calculated and offers a retry without losing the entered trip details.
4. **Given** a user has no vehicles, **When** they open the trip planner, **Then** they are told to add a vehicle in My vehicles before planning and can navigate there.
5. **Given** the planned route exceeds the selected vehicle's current estimated range, **When** the user requests a preview, **Then** the dashboard recommends compatible stations reachable within that range and shows the route through the recommended stop or stops.
6. **Given** a route is longer than the vehicle can travel on a full tank or charge, **When** stop recommendations are calculated, **Then** additional compatible stops are placed along the route so each leg is within the vehicle's saved maximum range.
7. **Given** no compatible station is found within the range needed for a route leg, **When** the route is previewed, **Then** the dashboard explains that the trip cannot be fully planned with the available station data.

---

### User Story 2 - Save and reuse favorite routes (Priority: P2)

As a signed-in user, I want to save a route as a favorite and see my saved routes below the origin and destination fields so I can plan familiar trips again.

**Why this priority**: Reusing saved locations avoids repeated entry and makes the planner more useful over time.

**Independent Test**: Save a route, refresh or revisit the planner, confirm the favorite remains visible, and use it to populate the planner and preview the route.

**Acceptance Scenarios**:

1. **Given** a route with an origin and destination, **When** the user saves it as a favorite, **Then** it appears in the favorite routes list below the location fields.
2. **Given** a saved favorite, **When** the user chooses it, **Then** the origin and destination are applied to the planner and the route can be previewed.
3. **Given** a signed-in user views favorites, **When** another account has saved routes, **Then** those routes are not shown to this user.

### Edge Cases

- The user has no saved vehicles or no favorite routes.
- An origin or destination is blank, ambiguous, unsupported, or resolves to the same place as the other endpoint.
- The routing service returns no route, times out, is rate-limited, or returns an error.
- A favorite is saved twice or becomes unavailable while the user is viewing it.
- A user's session expires while loading, saving, or using a favorite route.
- The dashboard is used at narrow screen widths or with keyboard navigation and assistive technology.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a successful sign-in, the user MUST arrive at the trip-planning dashboard as the primary authenticated destination.
- **FR-002**: The dashboard MUST let the user specify an origin and a destination by choosing suggested places; it MUST allow the user to use their current location as the origin after granting location permission.
- **FR-003**: The dashboard MUST let the user select a vehicle from their own saved vehicles. If none exist, it MUST explain that a vehicle is required and provide a path to My vehicles.
- **FR-004**: For the selected vehicle, the user MUST be able to enter the current fuel or battery level as a percentage. The system MUST estimate the currently available range from that percentage and the vehicle's saved range, then compare it with the planned route distance.
- **FR-005**: When the route exceeds current range, the dashboard MUST recommend compatible refueling or charging stations reachable within that range and include the recommended stops in the route preview.
- **FR-006**: For subsequent route legs, the dashboard MUST use the selected vehicle's saved maximum range to identify and add further compatible stops as needed, then recalculate the route through those stops.
- **FR-007**: The dashboard MUST show the planned route on a map with total distance, estimated travel time, recommended stops, and understandable leg distances.
- **FR-008**: If a compatible station cannot be found within a required leg's range, or locations cannot be resolved, no route is available, or a service fails, the dashboard MUST give understandable feedback, preserve entered trip details, and allow correction or retry. It MUST NOT present an incomplete route as fully planned.
- **FR-009**: The user MUST be able to save a route after entering its origin and destination and see favorite routes beneath the location fields. Choosing a favorite MUST populate the origin and destination fields without automatically requesting a route preview.
- **FR-010**: Favorites MUST belong to the signed-in account and MUST NOT be visible to another account.
- **FR-011**: The feature MUST preserve existing registration, sign-in, profile, vehicle-management, and sign-out behavior apart from directing a newly signed-in user to the trip-planning dashboard.
- **FR-012**: The dashboard MUST remain usable on supported screen sizes and through keyboard navigation, with accessible labels and understandable error messages.

### Key Entities

- **Trip plan**: The user's current, editable planning inputs: origin, destination, selected vehicle, and available range; a route preview provides distance, estimated travel time, and mapped route details.
- **Favorite route**: An origin and destination saved by one user for later reuse; it is private to that account.
- **Vehicle**: A vehicle owned by the signed-in user and available for selection in the planner, following the existing vehicle-management feature's supported vehicle data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of test users with a saved vehicle can request a valid route preview, including origin, destination, distance, and estimated time, within two minutes without assistance.
- **SC-002**: 100% of successful route previews show both distance and estimated travel time alongside the mapped route.
- **SC-003**: In all tested journeys where a route exceeds current range, the user receives compatible station recommendations based first on current range and then on maximum vehicle range, with the route preview updated to include those stops.
- **SC-004**: 100% of tested route-service, invalid-location, or unavailable-station failures show understandable recovery without clearing trip inputs or falsely marking an incomplete route as planned.
- **SC-005**: A user can see and reuse a saved favorite after leaving and returning to the planner.
- **SC-006**: 100% of tested attempts to view another account's favorites are denied without exposing those routes.
- **SC-007**: Existing authentication, profile, and vehicle-management flows continue to pass their established checks.

## Assumptions

- Existing account authentication and vehicle ownership rules remain authoritative; planning and favorites are available to the signed-in user for their own account.
- Route planning is for a standard passenger car by default; alternate route styles, trip history, and frequently used-route analytics shown in the legacy screenshot are outside this feature.
- Favorite routes are account-owned and remain available across sessions; they can be saved after entering the origin and destination, and selecting one populates those fields without automatically calculating a route.
- The user provides current fuel or battery percentage; the system estimates available kilometers using the selected vehicle's saved `range_km` as the maximum range. Stop recommendations match the vehicle: charging stations for electric vehicles and compatible fuel stations for combustion vehicles. Subsequent stops are planned using maximum range. Station data may not guarantee real-time availability or actual vehicle consumption.
- If the route cannot be completed within the available vehicle range because no suitable station is found for a leg, the dashboard reports the limitation instead of presenting an unsafe route as complete.
- The requested OpenRouteService integration is a required external dependency. Its credential must be supplied through local environment configuration and an example environment file must contain only a placeholder; secrets must never be committed, embedded in source, or exposed to the browser.
- The supplied route-service credential has appeared in the conversation. Treat it as exposed and rotate/restrict it before production use; do not include its value in repository artifacts.
- The existing React, TypeScript, Redux, and Material UI project conventions apply. Material UI is already declared in the frontend dependencies.