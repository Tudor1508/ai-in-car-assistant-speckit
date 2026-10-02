# Quickstart: Trip Planning Dashboard

This guide validates Feature 007 through the live frontend, backend, and OpenRouteService integration. A valid rotated ORS key and environment-configured test locations/ranges are required; tests do not substitute mocks or fixed provider responses.

## Configuration and startup

1. From `backend/`, create the local ignored `.env` using `.env.example` as a guide. Configure `DRIVE_WISE_ALLOWED_ORIGINS`, `DRIVE_WISE_API_HOST`, `DRIVE_WISE_API_PORT`, the required `OPENROUTESERVICE_*` settings including charging/fuel POI category IDs, and `TRIP_MAX_STOPS`. Set live account/vehicle inputs using `TRIP_TEST_ACCOUNT_NAME`, `TRIP_TEST_ACCOUNT_EMAIL`, `TRIP_TEST_ACCOUNT_PASSWORD`, `TRIP_TEST_VEHICLE_NAME`, `TRIP_TEST_VEHICLE_MODEL`, `TRIP_TEST_VEHICLE_YEAR`, `TRIP_TEST_VEHICLE_MILEAGE_KM`, `TRIP_TEST_VEHICLE_TYPE`, and optional `TRIP_TEST_FUEL_TYPE`. Configure route scenarios with `TRIP_TEST_ORIGIN_QUERY`, `TRIP_TEST_DESTINATION_QUERY`, `TRIP_TEST_UNRESOLVED_QUERY`, `TRIP_TEST_VEHICLE_RANGE_KM`, `TRIP_TEST_CURRENT_LEVEL_PERCENT`, `TRIP_TEST_STOP_ORIGIN_QUERY`, `TRIP_TEST_STOP_DESTINATION_QUERY`, `TRIP_TEST_STOP_VEHICLE_RANGE_KM`, `TRIP_TEST_STOP_CURRENT_LEVEL_PERCENT`, `TRIP_TEST_NO_STATION_ORIGIN_QUERY`, `TRIP_TEST_NO_STATION_DESTINATION_QUERY`, `TRIP_TEST_NO_STATION_VEHICLE_RANGE_KM`, `TRIP_TEST_NO_STATION_CURRENT_LEVEL_PERCENT`, `TRIP_TEST_CURRENT_LOCATION_LATITUDE`, and `TRIP_TEST_CURRENT_LOCATION_LONGITUDE`. Set a rotated ORS credential locally; never copy the exposed conversation key into source, examples, logs, or commits.
2. From `frontend/`, create `.env.local` using `.env.example` as a guide. Configure `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`, `NEXT_PUBLIC_PLACE_DEBOUNCE_MS`, `NEXT_PUBLIC_PLACE_MIN_CHARS`, `DRIVE_WISE_FRONTEND_HOST`, `DRIVE_WISE_FRONTEND_PORT`, and `PLAYWRIGHT_BASE_URL`. Also provide the same non-secret `TRIP_TEST_*` route/range inputs used by backend tests so Playwright submits the configured scenario through the live UI. No source-code URL fallback is used. The tile URL is public configuration, not a credential.
3. Install/update dependencies with `npm ci` from `frontend/` and `python -m pip install -r requirements-dev.txt` from `backend/` after the implementation updates the manifests.
4. From `backend/`, apply schema and start the API:

   ```powershell
   python -m alembic upgrade heads
   python -m uvicorn src.main:app --host $env:DRIVE_WISE_API_HOST --port $env:DRIVE_WISE_API_PORT --env-file .env
   ```

5. From `frontend/`, start the app:

   ```powershell
   npm run dev -- --hostname $env:DRIVE_WISE_FRONTEND_HOST --port $env:DRIVE_WISE_FRONTEND_PORT
   ```

6. Open the frontend origin configured for the dev server, register/sign in, add at least one vehicle in My vehicles, then return to Plan a trip. The frontend API URL must target the configured backend origin.

## Automated verification

From `backend/`:

```powershell
python -m compileall src
python -m pytest
```

From `frontend/`:

```powershell
npm run type-check
npm run build
npx playwright install chromium
npm run test:e2e
```

Trip integration tests use the live ORS service through actual backend routes and the real frontend. No provider mocks, response fixtures, intercepted `/trips` endpoints, fixed coordinates, or hardcoded ranges are used. Backend tests load the ignored local `.env`; tests fail clearly if the valid ORS credential or named scenario inputs are missing. Assertions check response shape and route/leg consistency rather than exact station names or counts, which may change with live OSM data. Do not force transient outage/rate-limit cases with simulated responses; verify them when the actual provider/network returns those conditions.

## Acceptance scenarios

1. Sign in and confirm `/` opens the dashboard; `/profile` and `/vehicles` remain reachable; sign-out returns to `/login`.
2. With a saved vehicle, select origin and destination suggestions, choose a vehicle, set a current level, and preview. Confirm the map and route show origin/destination, distance, estimated time, and leg/stop details.
3. Test a route within current range: confirm no unnecessary station is added.
4. Test a route beyond current range but feasible with stops: confirm the first stop is reachable using current percentage and later legs use maximum vehicle range; confirm the displayed route includes stops and totals.
5. Test a route for which no compatible station is reachable: confirm the plan is explicitly incomplete and not represented as a safe completed route.
6. Use the configured live test queries to exercise unresolved places, provider no-route results, and the configured stop scenario; confirm clear feedback, preserved form input, and retry behavior. Verify provider outage/rate-limit handling when a real upstream or network failure occurs, without substituting a mock response.
7. Save a selected origin/destination; refresh and confirm it remains under the location fields. Select it and confirm it only fills fields. Sign in as a second account and confirm the first account's favorite is not returned.
8. Try a vehicle ID owned by a different account; confirm a safe not-found response and no provider route is returned.
9. Check keyboard use, current-location permission denial using the configured test coordinates, narrow viewport layout, attribution visibility, and that no map tile requests are prefetched outside the visible viewport.

See [trips-api.md](contracts/trips-api.md), [trips-ui.md](contracts/trips-ui.md), and [data-model.md](data-model.md) for detailed contracts and constraints.
