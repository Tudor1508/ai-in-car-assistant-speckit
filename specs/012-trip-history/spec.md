# Feature Specification: Trip History

**Feature Branch**: `012-trip-history`

**Created**: 2026-10-07

**Status**: Approved

**Input**: User description: "Create an authenticated Trip History page with summary statistics, saved historical route maps, sortable trip entries, and pagination, using the supplied reference UI and existing DriveWise patterns."

## Clarifications

### Session 2026-10-07

- Q: Should a planned trip enter history automatically after a route preview succeeds, or only after the user explicitly saves the selected route? → A: Only after the user explicitly saves the selected route.
- Q: Should users be able to explicitly save routes that Trip Plan marks incomplete, or should saving be blocked until the route is complete? → A: Allow explicit saves of incomplete routes and label them clearly in history.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review my trip history (Priority: P1)

As an authenticated user, I want to see the trips I previously planned, with the route, vehicle, date, and available journey details, so I can review my travel plans.

**Why this priority**: A useful history page depends on having saved, identifiable trip records and presenting them only to their owner.

**Independent Test**: Plan trips as one account, open Trip History, and verify its entries show the saved endpoints, planning time, available trip details, and corresponding saved routes; verify another account cannot see them.

**Acceptance Scenarios**:

1. **Given** an authenticated user with saved trips, **When** they open Trip History, **Then** they see only their own trips, with origin, destination, planning date/time, and each available saved trip detail.
2. **Given** a trip is listed, **When** its map is displayed, **Then** the map shows the route saved for that trip, including its origin, destination, route line, and saved stops where available.
3. **Given** a historical map's configured tile/provider service is unavailable, **When** the trip card is displayed, **Then** its metadata remains usable and visible and a clear, non-blocking fallback appears inside the map area without failing the card or page or switching providers.
4. **Given** a user's session is missing or expires, **When** they open or request history, **Then** the existing authentication flow handles the session and no trip data is disclosed.
5. **Given** a user has no saved trips, **When** they open Trip History, **Then** they see a clear empty state and no fabricated trip data.

The planning flow MUST provide an explicit way to save the selected route as a trip. Saving a route MUST create the historical record; viewing a preview or saving a favorite endpoint pair MUST NOT create one. Successful route previews MUST NOT be saved automatically. Users MAY explicitly save an incomplete route, and its incomplete feasibility status MUST remain clear in history.

---

### User Story 2 - Understand my overall travel (Priority: P2)

As an authenticated user, I want an overview of my saved trips, total distance, and total estimated driving time so I can understand the scale of my planned journeys.

**Why this priority**: Summary figures provide useful context before reviewing individual trips.

**Independent Test**: Save trips with known route distances and durations, open the history overview, and verify totals cover the user's complete history rather than only the visible page.

**Acceptance Scenarios**:

1. **Given** a user with saved trips, **When** history loads, **Then** the overview reports the number of trips and sums the saved distance and estimated driving time across all of that user's trips.
2. **Given** the project has no persisted cost estimate for a trip, **When** the overview or trip entry is shown, **Then** it does not invent or imply an estimated cost.
3. **Given** a history page is changed or sorted, **When** summary data is displayed, **Then** it continues to describe all of the user's trips rather than only that page.

---

### User Story 3 - Sort and browse trips (Priority: P2)

As an authenticated user, I want to sort my trip history and move through it in pages so I can find older or relevant trips without waiting for an unbounded list to load.

**Why this priority**: Sorting and pagination make a growing history practical to browse.

**Independent Test**: Create more than 20 trips with distinguishable dates/details, verify the initial newest-first page contains no more than ten, change sorting, and browse forward and backward while retaining the selected sort.

**Acceptance Scenarios**:

1. **Given** a user has trips, **When** they first open history, **Then** the first page contains at most 10 trips ordered newest first, with a stable tie order for equal timestamps.
2. **Given** additional pages exist, **When** the user selects next or a page number, **Then** the corresponding trips load and the current page is clearly indicated.
3. **Given** the user has changed the sort order, **When** they move between pages, **Then** the chosen sort order is preserved.
4. **Given** the user is on the first or last page, **When** they view the controls, **Then** unavailable previous or next navigation is disabled or otherwise clearly unavailable.
5. **Given** a page request is pending or fails, **When** the user interacts with the history, **Then** they receive a loading or understandable error state and can retry without losing the selected sort.

### Edge Cases

- The account has no history, exactly one page, or exactly a multiple of ten trips.
- A trip has missing optional metadata, a deleted/renamed vehicle, or corrupted/missing route geometry; its details remain available and the map explains that the saved route cannot be displayed rather than showing a newly calculated route.
- The configured map provider or tile service is temporarily unavailable; origin, destination, date, distance, duration, vehicle, route type, and any cost value supported by the domain remain visible and usable (the current domain has no cost value to display). The map area shows a clear non-blocking fallback/error state; the card and page remain usable, and the application does not switch to another provider. This is separate from missing or corrupt saved route geometry.
- A trip has an incomplete route preview; it must be labeled as incomplete and must not be presented as a complete route.
- Several trips share the same creation time; ordering remains stable across page requests.
- A new trip is added or a trip is removed between page requests, changing the available page count.
- The history endpoint, a page request, or the map tile/provider service is unavailable.
- The user changes sorting while not on the first page; the new ordering begins at the first page.
- The layout is viewed on a narrow screen or operated with a keyboard or assistive technology.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a Trip History destination to authenticated users using the existing account navigation and visual conventions. Its page introduction MUST follow the supplied Trip History reference while using the application's existing reusable components and responsive patterns.
- **FR-002**: The planning flow MUST let the user explicitly save the selected route as a planned trip. The system MUST persist a history record only after that action; a successful route preview or saved favorite endpoint pair alone MUST NOT create a historical trip. A selected route marked incomplete MAY be saved explicitly, and MUST remain labeled incomplete in history.
- **FR-003**: Each history record MUST retain the information needed to identify and review that historical plan: a trip identifier, origin and destination labels and coordinates, creation/planning time, route distance, estimated driving duration when available, route preference when selected, feasibility status, and vehicle identity/display details available at planning time.
- **FR-004**: Every trip displayed in Trip History MUST show its corresponding route map. Each saved trip MUST retain enough route geometry and route metadata to render the route as it was planned. Trip History MUST reuse the Trip Plan map component and visualization conventions, including endpoint markers, route line, and saved stops where available. If saved route geometry is missing or corrupt, the trip details MUST remain visible and the map MUST explain that the saved route is unavailable; the system MUST NOT recalculate a different route as a substitute. If the configured map provider or tile service is unavailable, origin, destination, date, distance, duration, vehicle, route type, and any cost value supported by the domain MUST remain visible and usable (the current domain has no cost value to display) while a clear, non-blocking fallback/error state appears inside that map area; the card and page MUST remain usable, and the application MUST NOT switch providers.
- **FR-005**: The system MUST scope history records, summaries, and page results to the currently authenticated account and enforce ownership on the backend for every history operation.
- **FR-006**: Trip History MUST show a summary of the user's complete history: trip count, total saved distance, and total estimated driving time when trip records provide it. It MUST show estimated cost only if an established application domain value supports a reliable estimate; the current project has no persisted trip cost or vehicle consumption/price model, so cost is not required until such a domain capability exists.
- **FR-007**: Trip History MUST display each trip's available persisted metadata, including origin, destination, planning date/time, distance, estimated duration, vehicle, and selected route preference. Missing optional details MUST be omitted or clearly marked unavailable rather than fabricated.
- **FR-008**: Trip History MUST offer newest-first and oldest-first sorting by planning time, with newest-first as the default and a deterministic tie-break so trips do not move unpredictably between pages.
- **FR-009**: Trip History MUST paginate history, show no more than 10 trips on a page, begin on the first page, support next and previous navigation, indicate the current page when multiple pages exist, and preserve sorting while navigating.
- **FR-010**: History page requests MUST use backend pagination and return the page items together with enough pagination metadata to show available navigation. The backend MUST NOT require the frontend to download an unbounded history collection to paginate locally.
- **FR-011**: When sorting changes, the page MUST return to the first page. When the available page count changes, the current page MUST be brought into the valid range and its contents refreshed.
- **FR-012**: Trip History MUST provide accessible loading, empty, error, retry, and page-loading feedback. Failed page loads MUST preserve the selected sort and provide a way to retry.
- **FR-013**: Trip History MUST remain usable at supported desktop and narrow screen sizes and provide accessible names and keyboard operation for sorting, pagination, trip details, and maps.
- **FR-014**: If existing persistence does not contain a historical route geometry snapshot, the feature MUST add backend persistence and an authenticated, owner-scoped history contract that supplies it. The current Trip Plan preview returns route geometry and metrics but does not persist planned trips; the existing trip persistence stores favorite endpoints only. This backend and data contract work is a dependency of historical maps and cannot be replaced by a frontend-only workaround.

### Key Entities *(include if feature involves data)*

- **Historical trip**: An account-owned planned journey with stable identity and planning time, endpoints, route snapshot and metrics, and available vehicle and route-preference details.
- **Route snapshot**: The saved route geometry and associated distance, duration, feasibility, and stop/route metadata needed to reproduce the historical plan on the existing map.
- **History summary**: Aggregated count, distance, and available driving-time totals across all historical trips belonging to one account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successfully saved trips appear in their owner's history with the saved endpoints and planning time.
- **SC-002**: 100% of displayed historical maps use the saved route snapshot and show the saved origin and destination; no history map silently substitutes a newly calculated route.
- **SC-003**: In all verified accounts, history contains no trips or summary values belonging to another account.
- **SC-004**: Every history page displays at most 10 trips, and users can reach any available page while retaining the selected sort.
- **SC-005**: Trip count, total distance, and available driving duration match the complete saved history, independent of the currently selected page.
- **SC-006**: Users with no trips receive an understandable empty state, and failed history requests provide a retry path without losing the sort selection.
- **SC-007**: Users can identify a trip's endpoints, planning time, and available route details on supported screen sizes using keyboard navigation.
- **SC-008**: When map tiles/provider requests fail, trip metadata remains visible and usable and an in-map fallback appears without causing the card or page to fail or selecting another provider.

## Assumptions

- The existing authenticated account and ownership mechanisms remain authoritative; history is private to each account.
- A trip becomes historical when successfully saved as a planned trip. Merely previewing a route does not create a historical entry.
- The current system does not persist trip history: route previews are transient, while saved favorites contain only endpoint pairs. No trip-history endpoint exists. A backend history persistence model and authenticated paginated read contract are required.
- The current route-preview domain persists no trip cost estimate and the vehicle model has no consumption or energy/fuel price inputs. Cost totals and per-trip cost are therefore omitted unless a reliable domain capability is added in a future feature.
- The current route domain supports distance and estimated driving duration, selected preference (`fastest`, `shortest`, or `scenic`), route geometry, route stops, and complete/incomplete feasibility. These values should be snapshotted when a trip is saved. Vehicle information should retain a useful display snapshot so later vehicle edits or deletion do not rewrite history.
- Historical maps reuse the existing client-rendered Leaflet `RouteMap`, route coordinate representation, endpoint and stop markers, and configured tile URL/attribution. The project does not currently define a separate provider-neutral map abstraction; provider integration stays consistent with this existing implementation.
- Server-side pagination exists for admin lists but no trip-history pagination currently exists. History must add owner-scoped server pagination with a fixed maximum page size of 10.
- The authenticated account is supplied by the existing session dependency; current favorites associate records with `owner_account_id`. New history records use this same account ownership mechanism.
- Sorting supports planning time newest/oldest at launch; newest-first is the default.
- The supplied reference shows three summary cards, a newest-first selector, and stacked trip cards with journey identity, endpoints, date/time, and route details. Its cost field is conditional on available domain data.
- Existing shared-state, API access, component, responsive, authentication, error, and navigation patterns are reused; the frontend does not create mock production history.

## Dependencies

- Trip Plan must expose the selected route preview and provide an explicit save-trip action so users control which plans enter history.
- Backend persistence must store account ownership, endpoint snapshots, planning time, selected vehicle and route preference, route metrics, feasibility/stops, and route geometry sufficient to reproduce each saved map.
- The backend must provide authenticated, owner-scoped saving and server-paginated history reads with sorting, page metadata, and all-history summary values.
- The existing authenticated account shell, shared API client and Redux conventions, reusable Trip Plan map, configured Leaflet tile URL and attribution, and design system are required for the page.
