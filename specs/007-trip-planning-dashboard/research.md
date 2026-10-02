# Research: Trip Planning Dashboard

**Date**: 2026-10-02

## Decisions

### Use OpenRouteService from the backend for location, directions, and POIs

**Decision**: Add a backend provider adapter that sends authenticated requests to OpenRouteService (ORS) for place autocomplete, driving directions, and POI search. Keep the ORS credential exclusively in backend environment configuration and never return it to the browser. The frontend calls the existing authenticated Drive Wise API only.

**Rationale**: The official ORS documentation exposes Pelias autocomplete and search, directions accepting multiple coordinates, and OpenPOI search over buffered geometry. Its directions outputs provide route geometry, distance, and duration, while a route with multiple points can represent station stops. Server-side calls keep provider credentials private and let the backend validate vehicle ownership, normalize provider errors, and expose a stable application contract.

**Alternatives considered**:
- Call ORS from the browser: rejected because it exposes the API key and gives the browser authority over provider responses.
- Use the public Nominatim/Overpass services directly: rejected for this feature because public service limits and availability are not appropriate as an unbounded per-user request backend. Overpass remains a possible provider replacement behind the adapter if product constraints change.
- Use a commercial map provider: rejected because the feature explicitly requests OpenRouteService/OpenStreetMap.

### Use a range-aware, sequential station planner

**Decision**: Calculate the initial route, search for compatible fuel or charging POIs in a configurable corridor around its geometry, and build an ordered route through stops. The first leg is limited by the user's current fuel/battery percentage multiplied by the selected vehicle's persisted maximum range. Each stop assumes the driver restores the vehicle to full range; later legs use the persisted maximum range. Select a reachable station that advances the route, calculate each driving leg including detours, and repeat until the destination is reached or no feasible stop can be found. Recheck station candidates along updated route geometry, respect a configured maximum stop count, and recalculate the displayed directions through all chosen stops. Report total distance, driving duration, stop details, and leg distances.

**Rationale**: This matches the confirmed product behavior and avoids treating straight-line distance to a POI as driveable range. OSM-derived station data can be incomplete or stale, so missing stations must be reported as an incomplete plan, not silently treated as a completed route. Range is an estimate based on the user's percentage and saved full-range value; it is not a guarantee of real-world energy consumption or station availability.

**Alternatives considered**:
- Only show a warning when route distance exceeds current range: rejected by the user, who requested station recommendations and route stops.
- Divide total route distance by maximum range and add evenly spaced arbitrary points: rejected because points must be compatible real stations reachable by the road network.
- Treat the provider's vehicle-routing optimization endpoint as the station planner: rejected because the feature is a single car trip, not a fleet/job optimization problem; the backend must still enforce per-leg energy reachability.

### Use Leaflet and React Leaflet with OpenStreetMap raster tiles

**Decision**: Add `leaflet` 1.9.4, `react-leaflet` 5.0.0 (verified compatible with React 19), and the compatible `@types/leaflet` package. Render the interactive map in a client-only component and use Material UI for planner controls, route summary, errors, and stop list. Read the tile URL from public frontend environment configuration, show persistent OpenStreetMap attribution, and leave browser referrer behavior compatible with the OSM tile policy.

**Rationale**: The repository has no mapping package, while the reference UI is a browser map and the existing app requires MUI for standard controls. Leaflet supports interactive route geometry and markers without requiring a paid provider. The OSM tile usage policy requires HTTPS, visible attribution, caching compliance, valid Referer behavior, and prohibits prefetching/offline downloads.

**Alternatives considered**:
- Embed a static map image: rejected because users must preview an interactive route and stop markers.
- Use a proprietary map SDK: rejected because it adds an unrequested provider and credentials.
- Fetch or pre-cache broad tile regions: rejected by the OSM tile policy.

### Persist favorites as account-owned routes; keep current trip input transient

**Decision**: Add a `TripFavorite` persistence entity with owner account, origin/destination labels and coordinates, and creation timestamp. Add owner-scoped list/create operations. Keep the active draft, current-level percentage, route geometry, and recommended stops transient in Redux/client state; clear that state on logout. Selecting a favorite fills location fields and does not automatically request a route.

**Rationale**: Favorites must survive leaving the planner and belong to one account. Current trip state is not requested as history and should not introduce another persisted trip lifecycle. Reuse the existing SQLAlchemy/Alembic storage boundary, authenticated account dependency, CSRF protection for writes, and response envelopes.

**Alternatives considered**:
- Browser-only local storage: rejected because favorites must be private to and available across sessions for the account.
- Persist every route preview as trip history: rejected because trip history is outside the feature scope.

### Centralize configurable values and keep secrets out of source

-**Decision**: Read `DRIVE_WISE_ALLOWED_ORIGINS`, `DRIVE_WISE_API_HOST`, `DRIVE_WISE_API_PORT`, `OPENROUTESERVICE_API_KEY`, `OPENROUTESERVICE_BASE_URL`, `OPENROUTESERVICE_TIMEOUT_SECONDS`, `OPENROUTESERVICE_GEOCODE_MIN_CHARS`, `OPENROUTESERVICE_POI_CORRIDOR_METERS`, `OPENROUTESERVICE_POI_LIMIT`, and `TRIP_MAX_STOPS` from backend environment configuration. Require `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`, `NEXT_PUBLIC_PLACE_DEBOUNCE_MS`, `NEXT_PUBLIC_PLACE_MIN_CHARS`, `DRIVE_WISE_FRONTEND_HOST`, `DRIVE_WISE_FRONTEND_PORT`, and `PLAYWRIGHT_BASE_URL` from frontend/test environment configuration; do not fall back to source-coded URLs or origins. Read live integration-test queries, current-location coordinates, vehicle ranges/levels, and alternate stop scenarios from named `TRIP_TEST_*` environment variables. Document names with replace-me placeholders in example files, never fixed locations, coordinates, credentials, or route/station responses. Never commit or embed the supplied credential; it has been exposed and must be rotated before use.

**Rationale**: This meets the no-hardcoded-values requirement, works with the existing environment-based backend configuration and frontend `NEXT_PUBLIC_API_BASE_URL`, and protects the provider key from client bundles and repository history.

**Alternatives considered**:
- Store a real key in `.env.example` or frontend `NEXT_PUBLIC_*`: rejected because examples are committed and public frontend variables are browser-visible.
- Put provider URLs, service thresholds, or locations directly in source: rejected because environment changes would require code edits and would violate the user's configuration constraint.

### Verify the real frontend-to-backend-to-ORS integration

**Decision**: Integration tests use the running frontend, the real authenticated FastAPI routes and persistence, and live OpenRouteService geocoding/directions/POI endpoints. No mock provider, fixture response, intercepted application endpoint, fixed location/coordinate, or hardcoded route result is used. Credentials, place queries, current-location coordinates, vehicle ranges, current levels, server origins/ports, and alternate stop scenarios come from local environment configuration. Assertions validate the returned contract and internally consistent route/leg results rather than fixed station names, coordinates, or result counts that may change with live OSM data. Missing required configuration fails with a clear setup message; it is not silently skipped or replaced with defaults.

**Rationale**: The user requires normal frontend/backend integration with no mocks or hardcoded values. Live provider tests verify the actual boundary and require a valid, rotated ORS credential plus configured test locations. Tests must respect configured provider limits and avoid unnecessary repeated requests.

**Alternatives considered**:
- Mock provider responses or intercept trip endpoints in browser tests: rejected by the user because it does not exercise the normal integration path.
- Hardcode a test city, coordinates, range, or response: rejected because test inputs must be supplied through environment configuration.

## External References

- [OpenRouteService API documentation](https://openrouteservice.org/dev/#/api-docs): directions supports multiple locations, and the service exposes Pelias geocoding/autocomplete and OpenPOI endpoints.
- [OpenPOI Service documentation](https://github.com/GIScience/openpoiservice): POI queries accept point, line, and buffered geometries and return matching OpenStreetMap-derived features.
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/): attribution, HTTPS, browser Referer, caching, no bulk prefetch or offline tile downloads.
- Existing project conventions: `backend/src/auth/dependencies.py`, `backend/src/api/responses.py`, `backend/src/vehicles/`, `frontend/src/lib/api/client.ts`, `frontend/src/lib/store.ts`, and the Feature 006 vehicle model/contracts.
