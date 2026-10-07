# Feature Specification: Map and Stop Recommendations

**Feature Branch**: `010-map-and-stop-recommendation`
**Created**: 2026-10-05
**Status**: Draft
**Input**: Extend the implemented 007 trip preview so one action generates Fastest, Shortest, and Scenic route choices, and show tourist attraction recommendations on Scenic trips.

## Context and Existing Behavior

Feature 007 already provides an authenticated, transient trip preview. `POST /trips/preview` accepts origin, destination, vehicle ID, and current fuel/battery percentage; it returns one route geometry, distance, driving duration, ordered route legs, range feasibility, and compatible fuel or charging stops. The backend derives vehicle type and range from the account-owned vehicle. The map displays that route and its origin, destination, and ordered station markers. The route summary displays route metrics, legs, stop type, name, and distance from the previous leg. First-leg range uses the entered current level; subsequent legs assume a full vehicle at each compatible stop. The preview is not persisted.

The 007 specification and contracts do not define route preferences or tourist attraction stops. The 007 plan explicitly lists alternate route styles as out of scope. Current request/response schemas have no route preference or attraction type; current route provider code requests a single directions result and queries compatible charging/fuel stations; current frontend has no route preference control or attraction markers/list items. Thus the three requested preferences and tourist attractions are new requirements for 010, not behavior already delivered by 007.

The old application README describes fastest, shortest/balanced, and scenic route choices and tourism recommendations, but is a behavior reference rather than evidence of the current implementation or an approved external integration. The `plan_route.png` reference depicts Fastest, Shortest, and Avoid highways; it does not depict Scenic. The route example illustrates a route line and ordered station markers. The project constitution and 007 contracts require explicit backend contracts, authenticated account-scoped data, safe provider errors, accessible UI, and preservation of the approved stack and existing behavior.

The requested `docs/old_app_README.md` path was not present; the available README reviewed is `docs/reference-ui/old_app_README.md`.

### Decisions confirmed for 010

- Reuse only the existing 007 ORS Directions and OpenPOIService integrations; do not add another provider or service.
- Fastest minimizes ORS estimated driving duration; Shortest minimizes ORS estimated driving distance, to the extent supported by its driving directions request. If the requested choice is unavailable, report that clearly and never silently relabel/substitute the selection.
- `POST /trips/preview` gains an optional route preference. When omitted, preserve the existing 007 request and behavior. The planner requests all canonical route choices together; the extended API retains the established authenticated API/error conventions.
- Scenic attractions are informational POIs from the existing OpenPOIService integration. Show only returned name, category, and location/coordinates when supplied. Keep attractions separate from energy stops, order them by position along the route, and do not alter route geometry, distance, duration, legs, or energy feasibility because of them. Fuel/charging stop planning remains governed by 007.
- Define Scenic as the route or routes with the greatest number of distinct POIs in OpenPOIService categories `attraction` and `viewpoint`, among complete routes ORS provides for the trip. For long trips, compare the complete Fastest and Shortest routes; include alternative routes only when ORS returns them for that request. Choose the quickest route if candidate POI counts tie. Do not compose route segments, add providers, or claim a global optimum.
- For each Scenic candidate, adapt only the tourist POI search buffer as needed to fit ORS's 50 km² maximum POI query area. The buffer MUST be no greater than the existing configured POI corridor or ORS's 2 km maximum search radius. Keep the existing configured corridor unchanged for fuel and charging recommendations. The narrower Scenic buffer means attractions farther from the route may not be returned; do not split route geometries.
- Display three canonical route choices: Fastest, Shortest, and Scenic. Compare Fastest, Shortest, ORS alternatives when available, and one complete route requested with highways avoided. These candidates are internal and are not separately exposed. If multiple distinct candidates share the greatest attraction count, choose the quickest as the one Scenic result. If no attractions are found, keep Scenic available with a zero-attraction result. If the POI source cannot fully evaluate the candidates, keep Scenic available using the best checked candidate (or Fastest if none could be checked) and explain the limitation. Keep one separately selectable card and option ID for each canonical choice, even when geometries match.
- Display source-provided attraction fields and limit recommendations to at most one attraction per 100 km route section, excluding the first 10 km and attractions too close to mandatory energy stops.

### Verified ORS/OpenPOI capabilities and limitation

The 007 adapter currently posts one directions request without `preference` or `alternative_routes` and parses only the first returned feature. Its configured POI query covers fuel and charging category IDs only; no tourism category is currently configured. The existing backend settings use the ORS/HeiGIT public API base and key configuration.

Current [ORS Directions request documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types) describes route results as a list; [ORS API restrictions](https://openrouteservice.org/restrictions/) allow at most three alternative routes and restrict alternative-route requests to routes no longer than 100 km. ORS does not guarantee that the requested count is returned. Therefore ORS alternatives alone cannot guarantee the most attraction-rich route for journeys above 100 km or when too few distinct alternatives are returned. For shorter journeys, ORS may provide a bounded candidate set, but it does not optimize candidates against OpenPOI attraction count.

The [OpenPOIService category documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/poi/) lists POI category groups and IDs, including tourism categories. For 010, the confirmed category names are `attraction` and `viewpoint`, if available from the source; the currently configured 007 categories cover fuel and charging only. The [OpenPOIService repository documentation](https://github.com/GIScience/openpoiservice#api-documentation) describes POI results as a GeoJSON FeatureCollection; normalize/display only the name, category, and location fields actually supplied.

### Scenic candidate policy and capability boundary

For trips longer than 100 km, ORS does not support its alternative-route option under the published public API restriction. The comparison includes complete Fastest and Shortest routes, a complete highways-avoiding route requested through ORS, and any complete alternatives ORS happens to return. OpenPOIService supplies the distinct `attraction` and `viewpoint` POIs used to count each candidate. This defines the best-scoring route only among the candidates ORS supplies; it does not claim a global optimum. If ORS returns no distinct alternative, Scenic uses the best route among the Fastest/Shortest and highways-avoiding requests that succeeded. If POI comparison is limited, Scenic remains available using the best checked candidate. No segment composition or additional provider is permitted. The displayed Scenic recommendations are sampled at no more than one per 100 km route section, after the first 10 km, and spaced away from mandatory energy stops.

For each Scenic candidate, calculate the existing projected route length using the provider adapter's current route-length method, then set the tourist query buffer to the smaller of the configured POI corridor, ORS's 2 km maximum search radius, and `25,000,000 / projected_route_length_m`. This keeps the adapter's estimated buffered corridor area (`projected_route_length_m * 2 * buffer_m`) at or below 50 km². For a projected 350 km route and a configured 1,000 m corridor, the buffer is about 71 m. Reject complete route linestrings whose projected length exceeds ORS's 500 km limit; do not compose or split segments to bypass either limit. Apply this adaptive buffer only to `attraction`/`viewpoint` requests; leave 007 fuel/charging queries at their configured corridor.

## User Scenarios & Testing

### User Story 1 - Generate canonical route choices (Priority: P1)

As a signed-in driver, I can generate Fastest, Shortest, and Scenic choices together and select one result to inspect, so I can compare the canonical route types without configuring a preference first.

**Why this priority**: Drivers need an immediate comparison of useful route types before choosing which geometry, metrics, and recommendations to inspect.

**Independent Test**: Generate routes once for valid endpoints and a vehicle; verify available canonical choices are named and that selecting one updates the map and summary to that result.

**Acceptance Scenarios**:

1. **Given** valid origin, destination, and an eligible vehicle, **When** the driver activates Generate routes, **Then** Fastest, Shortest, and Scenic are generated in one request and each available choice is identified with its own route geometry and details.
2. **Given** two or more canonical choices resolve to the same geometry, **When** results are shown, **Then** three separate cards remain visible and selectable with their own labels, IDs, and matching option data.
3. **Given** the driver selects another generated route card, **When** the selection changes, **Then** map, distance, duration, legs, feasibility, energy stops, and attractions update to that route's matching data without another provider request.
4. **Given** the same trip inputs are submitted again, **When** generation is pending or fails, **Then** existing loading/error behavior preserves inputs and does not label stale geometry as newly generated.
5. **Given** Scenic cannot be calculated, **When** routes are shown, **Then** the UI explains that Scenic is unavailable and leaves Fastest/Shortest usable.

### User Story 2 - View tourist attraction recommendations on scenic routes (Priority: P1)

As a driver choosing a scenic route, I can see recommended tourist attractions in route order on the map and in a separate recommendation list, so I can understand where each attraction is relative to my journey.

**Why this priority**: Tourist stops are the defining additional value of the scenic route option.

**Independent Test**: Preview a scenic route with attraction results and verify each recommended attraction has a distinguishable map marker and a matching ordered list entry with the required information and route relationship.

**Acceptance Scenarios**:

1. **Given** a scenic route with tourist attraction recommendations, **When** the preview succeeds, **Then** every recommendation selected by the route-section limit is displayed on the map and in a separate recommendation list, with returned name, category, location, and order/position relative to the route when those values are supplied or derivable from returned coordinates.
2. **Given** attractions and vehicle-compatible energy stops occur on one scenic route, **When** the preview is shown, **Then** attractions appear in a distinct ordered recommendation list and on the map, separate from the energy-stop list; the energy-stop count includes only fuel/charging stops.
3. **Given** an attraction is returned near the selected route, **When** it is displayed, **Then** it is presented as an informational recommendation ordered by its position relative to the route and does not become a waypoint or alter route geometry/metrics/feasibility.
4. **Given** no attractions are found across Scenic candidates, **When** the response succeeds, **Then** Scenic remains available with zero attractions; Fastest/Shortest and their energy stops remain usable.
5. **Given** attraction detail fields are unavailable, **When** an attraction is displayed, **Then** the UI still displays its name, type when known, location, and route order using available data, and does not fabricate a description or rating.

### User Story 3 - Preserve range-aware stops on fastest and shortest routes (Priority: P1)

As a driver on a Fastest or Shortest route, I continue to receive the compatible fuel or charging stops needed by the 007 range-planning behavior.

**Why this priority**: A route preference must not regress the operational behavior of the current planner.

**Independent Test**: For a combustion vehicle and an electric vehicle, preview Fastest and Shortest routes where current range cannot cover the full route; verify compatible stops, ordered legs, feasibility state, and map/list markers remain consistent with the selected route and 007 range assumptions.

**Acceptance Scenarios**:

1. **Given** a Fastest route within the vehicle's available range, **When** preview succeeds, **Then** it shows the route with no unnecessary energy stop and reports feasibility consistently with 007.
2. **Given** a Shortest route exceeding the current level's first-leg range, **When** a compatible station is available, **Then** the stop is reachable for that leg, is shown in both map and list, and later legs continue to use the vehicle's saved maximum range assumption.
3. **Given** no compatible station chain can complete a Fastest or Shortest route, **When** preview succeeds with a partial plan, **Then** feasibility is incomplete and the UI does not claim that the destination is reachable.
4. **Given** a scenic route requires energy stops as well as tourist recommendations, **When** preview succeeds, **Then** compatible range stops continue to be shown and the route is not presented as feasible based only on its tourist stops.

### User Story 4 - Understand route progress, loading, and failures (Priority: P2)

As a driver, I can tell which canonical route a result represents, how stops relate to the route, and whether generation is still loading or has failed.

**Independent Test**: Exercise pending, success, unavailable route type, provider error, no route, no attraction results, and incomplete energy feasibility; verify distinct, recoverable UI states with inputs retained.

**Acceptance Scenarios**:

1. **Given** a route preview or attraction lookup is pending, **When** the request is in progress, **Then** a visible and screen-reader-announced loading state appears, duplicate preview submission is prevented, and entered trip inputs remain available.
2. **Given** routing or attraction retrieval fails, **When** the failure is returned, **Then** the UI shows a safe plain-language error and retry/correction action, preserves the inputs, and does not expose credentials, stack traces, or raw provider messages.
3. **Given** no road route exists, **When** preview completes, **Then** the UI reports no route and does not show stale map geometry or metrics as the result.
4. **Given** an incomplete range plan, **When** it is rendered, **Then** the existing 007 incomplete-feasibility messaging remains distinct from route-service and attraction errors.

## Requirements

### Functional Requirements

- **FR-001**: The authenticated trip planner MUST provide one accessible Generate routes action that requests canonical Fastest, Shortest, and Scenic choices together; available choices MUST be shown with selectable, accessible labels.
- **FR-002**: The planner MUST show three selectable choices labelled Fastest, Shortest, and Scenic, each with its own option ID and data, even when two or more choices have identical geometry. Selecting an already-generated choice MUST NOT trigger another provider request.
- **FR-003**: The preview contract MUST accept an optional route preference and return enough information to identify the preference used and render its matching route geometry, metrics, legs, feasibility, and stops/recommendations. When the field is omitted by a legacy client, the existing 007 request behavior MUST be preserved. Unknown preference values MUST be rejected using the existing validation/error conventions.
- **FR-004**: Fastest and Shortest results MUST retain the 007 account authentication, CSRF/origin validation, owner-checked vehicle selection, coordinate validation, provider error handling, and transient non-persistent preview behavior.
- **FR-005**: For Fastest and Shortest, the planner MUST retain 007's vehicle-compatible charging/fuel stop recommendations, first-leg current-range calculation, later-leg full-range assumption, ordered leg distances, stop bound, and incomplete-plan behavior. Range feasibility MUST be evaluated against the selected route and its stops.
- **FR-006**: Scenic results MUST include recommended tourist attractions associated with the selected route geometry and display them on the map and in a distinct ordered recommendation list, separate from the 007 energy-stop list.
- **FR-007**: Each displayed tourist attraction MUST show its available name, location, attraction type/category when available, its order along the journey, and its route-relative position expressed as distance from the origin or previous stop. Missing optional source detail MUST be omitted rather than invented.
- **FR-008**: Tourist attraction recommendations MUST NOT be mandatory waypoints and MUST NOT change the selected route geometry, distance, duration, legs, or range feasibility. The UI MUST NOT imply a detour or that the driver has visited an attraction.
- **FR-009**: For Scenic routes, energy stops MUST remain a distinct vehicle-compatible collection under 007 and tourist recommendations MUST remain separate. Each collection's map markers MUST match its own list identities and route-relative order; attractions MUST NOT be counted as energy stops or included in energy feasibility.
- **FR-010**: Attraction order and position relative to the route MUST allow the user to understand where an attraction lies in the journey. Scenic recommendations MUST include at most one attraction per 100 km route section, exclude the first 10 km, and remain at least 10 km from mandatory energy stops and one another.
- **FR-018**: Tourist attractions and restaurant recommendations MUST be no farther than 10 km from the selected route geometry, measured from their source coordinates to the nearest route segment. Farther results MUST be filtered before returning or displaying them.
- **FR-011**: The route map, route preference label, distance, driving duration, legs, and feasibility state MUST correspond to the same returned route result. The energy-stop list and attraction-recommendation list MUST remain separate. Driving duration MUST continue to distinguish driving time from charging/refueling dwell time; attraction dwell time is not included unless explicitly returned and labeled.
- **FR-012**: When no attractions are returned, Scenic MUST remain available with an explicit zero-attractions state. When the POI source cannot fully evaluate the candidates, Scenic MUST remain available using the best checked candidate, or Fastest if none could be checked, and the UI MUST explain that attraction coverage is incomplete.
- **FR-013**: Loading, validation, no-route, unsupported/unavailable preference, provider failure, no-attraction, and incomplete-range states MUST be distinguishable and recoverable where retry/correction is possible. Existing inputs MUST be preserved after recoverable errors.
- **FR-014**: Responses MUST use the project's existing authenticated API wrapper and shared error envelope. Provider credentials and raw provider-internal messages MUST remain server-side.
- **FR-015**: The map MUST retain its responsive Leaflet implementation and visible map attribution. Route and stop controls/list must remain keyboard accessible, have persistent labels, and announce asynchronous status/errors accessibly.
- **FR-016**: Route preview and attraction recommendations MUST remain transient in 010. This feature MUST NOT add trip history, saved trip results, analytics, or persistence of route preferences or recommendations.
- **FR-017**: Existing 007 place search, current-location selection, vehicle selection, current level input, favorite endpoint selection/saving, navigation, and session behavior MUST continue to work.
- **FR-018**: For each Scenic candidate, the backend MUST adapt the tourist POI buffer to keep the estimated query area within ORS's 50 km² maximum, without exceeding the configured corridor or ORS's 2 km maximum search radius. This adaptation MUST apply only to tourist POI queries; existing 007 fuel/charging queries MUST retain their configured corridor. A full route linestring whose projected length exceeds ORS's 500 km maximum remains Scenic-unavailable and MUST NOT be split.

### Key Entities (Contract-Level)

- **Route choice**: one of Fastest, Shortest, or Scenic generated together by the planner; the user selects an available result for display.
- **Route preview**: the existing 007 geometry, metrics, vehicle feasibility, legs, and ordered stops, extended to represent the selected preference and attraction recommendations where applicable.
- **Route stop**: an ordered stop related to the selected route; it is classified as a compatible fuel stop, compatible charging stop, or tourist attraction. Fields remain subject to the project's API contract conventions and data actually available.
- **Tourist attraction recommendation**: a non-persisted place associated with a scenic route, with location and whatever name/category/route-relative information is available for display. A recommendation is not evidence that the user visited the place.

## Success Criteria

- **SC-001**: One Generate routes action produces the available canonical choices; selecting any choice displays only its matching route details, and duplicate geometries are labeled together.
- **SC-002**: For Fastest and Shortest previews, 100% of returned 007-compatible energy stops appear on both map and ordered list with identical identity, type, and sequence; the existing complete/incomplete feasibility result remains consistent with the displayed legs.
- **SC-003**: For Scenic previews with returned attractions, 100% of those attractions appear on both map and ordered list, with a type label, available name/location, sequence, and route-relative distance; route and stop order are consistent.
- **SC-004**: When all Scenic candidates have zero attraction results, Scenic remains available with an explicit zero-attractions message while Fastest/Shortest routes and energy stops remain usable.
- **SC-005**: In 100% of tested unavailable-preference, no-route, routing-provider failure, attraction-provider failure, validation, and incomplete-range cases, the state is distinguishable, inputs are retained when recovery is possible, and no raw provider details or credentials are shown.
- **SC-006**: A route preference change cannot display route metrics or geometry from a previous preference as if they belong to the new one; loading status is exposed visually and to assistive technology.
- **SC-007**: No preview, selected preference, or attraction recommendation is persisted by 010; no 009 history behavior is introduced.
- **SC-008**: For every Scenic result, 100% of returned attraction markers match the separate recommendation list and its route order; none are included in the energy-stop count or feasibility calculation.
- **SC-009**: When multiple Scenic candidates tie for the highest attraction count, exactly one Scenic choice is exposed, selecting the quickest tied candidate. ORS alternatives are not displayed separately.
- **SC-010**: For every queried Scenic candidate within the complete-linestring limit, the computed tourist buffer is positive, no greater than the configured corridor or 2 km, and keeps the estimated query area at or below 50 km²; 007 energy-stop queries continue using the configured corridor unchanged.

## Scope Boundaries

### In Scope

- Add one all-routes request to the existing authenticated preview flow and expose the canonical Fastest, Shortest, and Scenic results.
- Keep existing map, route metrics, vehicle-aware fuel/charging recommendations, and feasibility behavior.
- Add scenic tourist attraction recommendations and their map/list representation, including route order and relationship information available from the selected result.
- Define accessible loading, empty, unavailable, and error states for route and attraction results.

### Out of Scope

- Rebuilding the 007 map or replacing its existing fuel/charging stop planner.
- Implementing trip history, saved trip results, analytics, or any persistence assigned to `009-saved-routes-and-history`.
- User editing, deleting, or marking recommended stops as visited; route navigation/turn-by-turn guidance; family-friendly filtering; fuel/charging dwell-time calculation; attraction dwell-time calculation.
- Selecting or committing attraction recommendations as mandatory waypoints; attractions never alter 010 route geometry or energy feasibility.

## Dependencies and Integration with 007 and 009

- 010 extends the existing `POST /trips/preview` flow, trip-preview UI/state, `RouteMetrics`, route geometry, and ordered `RouteStop` concepts documented in `specs/007-trip-planning-dashboard/contracts/trips-api.md` and `trips-ui.md`. It does not create a second planner or map.
- The 007 request currently has no preference field; the response currently has no selected preference or tourist stop category. The 007 route is a single driving result, and its stop schema permits only `charging` and `fuel`. 010 must explicitly version/evolve the existing request/response contract and represent tourist stops without breaking current 007 clients or semantics. The compatible contract evolution mechanism is to be established during planning; this specification does not prescribe a versioning mechanism.
- Fuel/charging stop calculation remains vehicle-aware and backend-authoritative under 007. Attraction recommendations must be associated with the selected route result and must not override or falsely satisfy range requirements.
- 009 may depend on the selected preference and the route/stop identifiers or snapshots returned by 010 if future history is to reproduce what the user saw. 010 does not persist or design that history schema; 009 owns those decisions.

## Assumptions and Open Decisions

Provider choice, Fastest/Shortest meanings, optional request compatibility, Scenic candidate policy and its bounded guarantee, attraction annotation behavior, POI categories (`attraction` and `viewpoint` when returned by OpenPOIService), and canonical route generation, tie-breaking, and unavailable-Scenic presentation are confirmed above. Attraction display is limited to at most one recommendation per 100 km route section, excludes the first 10 km, and keeps a 10 km gap from energy stops and other displayed recommendations. No provider/service beyond the existing 007 ORS/OpenPOIService integrations is permitted. No product clarification remains open; API/UI contracts record the revised generation and canonical-choice behavior.
