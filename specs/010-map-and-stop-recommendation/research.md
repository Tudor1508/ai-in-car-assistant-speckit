# Research: Map and Stop Recommendations

**Date**: 2026-10-05
**Scope**: T003 research for extending the existing 007 trip preview. No implementation or provider calls were performed.

## Decisions recorded from the approved specification

- Reuse the existing backend integrations only: ORS Directions and OpenPOIService. Keep provider credentials server-side; the frontend continues to call only the authenticated Drive Wise API.
- Fastest uses ORS's `fastest` preference; Shortest uses `shortest`. Scenic compares complete route candidates ORS provides. For long journeys, the candidate set includes complete Fastest and Shortest routes and any alternative routes actually returned for an eligible request. Do not compose route segments, add providers, or claim a global optimum.
- For each candidate, count distinct returned POI features from tourism categories `attraction` (category ID 622) and `viewpoint` (category ID 627). Select every distinct candidate tied at the maximum count. Show each tied option's route distance and estimated driving duration.
- If the candidates cannot be compared because ORS does not return distinct complete routes, the POI query cannot cover a candidate geometry, or POI results may be truncated at the configured limit, return Scenic unavailable with a safe reason. Keep Fastest and Shortest usable.
- Attractions remain informational. The existing 007 energy-stop planner determines compatible fuel/charging stops and feasibility for each candidate route option. Attraction features do not become waypoints and do not change geometry, metrics, legs, or feasibility. The interval between attractions is intentionally unspecified and has no filtering/sampling effect.
- Scenic results and the selected candidate remain transient; no history or persistence is introduced. 009 may later consume preference or route-option snapshot data, but defines that separately.

## Existing 007 integration and contracts

The current `backend/src/trips/provider.py` requests one ORS directions result and parses one route. The current request schema has no preference; the response contains one `route`, `legs`, and `stops`, with stop types restricted to `charging` and `fuel`. The POI adapter currently queries charging/fuel categories, and `TripSettings` has a configured POI corridor and result limit (currently defaulting to 1,000 m and 50 features). The frontend uses the authenticated `apiRequest` wrapper and shares preview data through the trips Redux state. The existing client-only Leaflet map and OSM tile attribution are reused.

The 007 endpoint conventions remain authoritative: active-account authentication; CSRF and origin checks on preview; owner-scoped vehicle lookup; strict request validation; success envelope `{ "data": ... }`; shared safe error envelope; no raw provider messages or credentials in responses. An omitted preference preserves the existing 007 request behavior and response shape for legacy callers.

## ORS Directions capability and limits

The current [ORS Directions request/return documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types) documents route results as a collection and each result has route summary metrics and geometry. The ORS public service exposes Fastest/Shortest preference and alternative-route request options; the [`openrouteservice-py` official client signature](https://github.com/GIScience/openrouteservice-py/blob/master/openrouteservice/directions.py) includes `preference` and `alternative_routes` arguments, and its request example shows an alternative target count.

The current [ORS public restrictions](https://openrouteservice.org/restrictions/) state that driving Directions supports routes up to 6,000 km, while alternative and round-trip requests are limited to 100 km and at most three alternatives. ORS may return fewer alternatives than requested. This supports comparing full Fastest and Shortest routes for long trips, but does not guarantee alternative routes or the global attraction maximum. Scenic claims only the highest count within the returned, comparable candidate set.

## OpenPOIService categories, result shape, and limits

The current [ORS POI category reference](https://giscience.github.io/openrouteservice/api-reference/endpoints/poi/) identifies the tourism group as 620, `attraction` as 622, and `viewpoint` as 627. Use only IDs 622 and 627 for 010 tourism queries; retain existing 007 charging/fuel queries independently. The [OpenPOIService documentation](https://github.com/GIScience/openpoiservice#api-documentation) describes `request: "pois"` responses as GeoJSON FeatureCollections and supports category filters and geometry queries. Returned fields vary with mapped/imported OSM data; only source-provided names, category values, geometry/coordinates, and identifiers may be passed through.

The current [ORS API restrictions](https://openrouteservice.org/restrictions/) cap POI requests at 50 km², 500 km of linestring length, and a 2 km search radius. The project also configures `OPENROUTESERVICE_POI_CORRIDOR_METERS` and `OPENROUTESERVICE_POI_LIMIT` (currently defaults 1,000 m and 50). A route longer than 500 km cannot be searched as one complete linestring under the published public limit; 010 does not split it into route segments. If a candidate cannot be queried as a whole, Scenic is unavailable for that comparison and Fastest/Shortest continue to work. If a POI response reaches the configured result limit, it may be truncated; do not assert a reliable maximum-count comparison from potentially truncated results. Return a safe Scenic-unavailable result in that case.

“Distinct POI” means a distinct source feature in the combined response for categories 622 and 627. Where the source supplies an identifier, use it to avoid counting a repeated copy of that same feature twice; do not invent spatial deduplication rules or merge separate source features based on name or proximity. The contract reports the returned distinct count, not an independently verified count of every real-world attraction.

## User-approved adaptive Scenic corridor

The user approved reducing the OpenPOI buffer for Scenic tourism queries only so a full route that is within the 500 km linestring cap can fit the public 50 km2 maximum query area. Use the existing projected route-length estimate and calculate `buffer_m = min(configured_corridor_m, 2000, 25000000 / projected_route_length_m)`. This keeps the estimated area `projected_route_length_m * 2 * buffer_m` at or below 50 km2. At a projected 350 km and configured 1,000 m corridor, the resulting buffer is about 71 m. The existing configured 007 fuel/charging query buffer remains unchanged. This narrows attraction discovery on long routes; do not split route geometry or add a provider. A route over the 500 km complete-linestring limit, or a POI result at the configured limit that may be truncated, still makes Scenic unavailable.

## Candidate processing constraints

1. Omission of `route_preference` must remain on the existing 007 path and not trigger extra route or POI requests.
2. Fastest and Shortest each use their explicit ORS preference. Scenic obtains complete Fastest and Shortest candidates; request ORS alternative routes only within its published eligibility/limit, and use only complete alternatives returned in the response.
3. Candidate route geometries must be distinct enough to compare. Identical candidate geometries are not separate Scenic choices. Do not relabel a single Fastest or Shortest geometry as Scenic when no distinct comparison exists.
4. Query the existing OpenPOIService with the combined confirmed category IDs and each candidate's full geometry, subject to ORS limits and project corridor/result limit. Any inability to compare candidates completely is a Scenic-unavailable outcome, not a reason to silently select a fallback.
5. Apply the existing 007 energy-stop/range behavior to each route option returned to the user. Each option carries its own route geometry, metrics, legs, feasibility, energy stops, and Scenic attraction list so switching tied options cannot mix route data.
6. Count/category scoring is only for route selection. Attraction POIs are not included in energy-stop count or feasibility. The attraction list is ordered by progress along that option's displayed route; it has no fixed time/distance interval.

## Alternatives explicitly not selected

- Route-segment composition or segmented POI queries to bypass public endpoint limits: not approved and not part of 010.
- Any new routing, map, POI, or data provider: not approved.
- A scenery heuristic, OSM-tag inference beyond categories 622/627, attraction rating/description, route detour to an attraction, or fixed attraction interval: not approved.
- Treating Fastest or Shortest as Scenic without a distinct, comparable candidate set: not approved.

## References

- [ORS Directions requests and return types](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types)
- [ORS public API restrictions](https://openrouteservice.org/restrictions/)
- [ORS POI endpoint and category IDs](https://giscience.github.io/openrouteservice/api-reference/endpoints/poi/)
- [OpenPOIService API documentation](https://github.com/GIScience/openpoiservice#api-documentation)
- [ORS Python client directions implementation](https://github.com/GIScience/openrouteservice-py/blob/master/openrouteservice/directions.py)
- [007 trips API contract](../007-trip-planning-dashboard/contracts/trips-api.md)
- [007 trip UI contract](../007-trip-planning-dashboard/contracts/trips-ui.md)
- [Drive Wise constitution](../../.specify/memory/constitution.md)
