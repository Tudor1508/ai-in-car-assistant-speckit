# Quickstart: Feature 008 Route Preferences and Scenic POIs

This guide exercises the 008 extension through the real authenticated frontend, backend, ORS, and OpenPOIService integrations. It does not use provider mocks, fixed coordinates, sample provider responses, or a new provider. Preview requests consume provider quota; use configured test locations and do not repeat requests unnecessarily.

## Prerequisites and configuration

1. Complete the Feature 007 setup in [007 quickstart](../007-trip-planning-dashboard/quickstart.md). In particular, configure the ignored local `backend/.env` with a valid ORS/HeiGIT API key, allowed frontend origin, provider base URL/timeouts, existing POI corridor/result limit, test account/vehicle, and environment-supplied route scenarios. Never put a provider key in frontend configuration or a committed example.
2. Configure the 008 tourist category IDs in backend-only settings as `OPENROUTESERVICE_TOURIST_CATEGORY_IDS=622,627` (`attraction` and `viewpoint`). The implementation must read this setting through `TripSettings` and add the same non-secret entry to `backend/.env.example`; never add it to `frontend/.env.local`.
3. Complete the Feature 007 frontend `.env.local` setup for API base URL, map tiles, attribution, browser host/port, and Playwright URL. The ORS/HeiGIT API key and base URL remain backend-only.
4. Use an account with at least one owned vehicle. Verify the vehicle's saved type/range and current fuel/battery percentage before comparing route options.

## Start the application

Use separate terminals from the repository's `team3_git-happens` directory.

Backend terminal (PowerShell):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m alembic upgrade heads
python -m uvicorn src.main:app --host $env:DRIVE_WISE_API_HOST --port $env:DRIVE_WISE_API_PORT --env-file .env
```

Frontend terminal:

```powershell
cd frontend
npm run dev -- --hostname $env:DRIVE_WISE_FRONTEND_HOST --port $env:DRIVE_WISE_FRONTEND_PORT
```

Open the configured frontend origin, sign in, and go to **Plan a trip**. Alembic remains part of normal backend startup when migrations are pending; 008 itself is not expected to add persistence or a migration.

## Manual acceptance walkthrough

1. Pick origin and destination from suggestions, choose an owned vehicle and current level, then activate Generate routes. Verify Fastest, Shortest, and Scenic appear as named choices and each shows its own route distance, duration, and feasibility. Duration excludes refueling/charging dwell time.
2. Select Shortest, then Scenic if available. Confirm selection changes the matching map, legs, feasibility, energy-stop list, and attraction list locally without a second provider request. If two choices share geometry, verify one card carries both labels.
3. For Scenic, verify the selected route has the highest distinct POI-feature count among the complete Fastest/Shortest, highway-avoiding, and any returned alternative candidates, not a claimed global optimum. If candidates tie, the quickest tied candidate is used and provider alternatives are not exposed as numbered choices.
4. Verify the Scenic card shows its attraction count and its route details. Only one Scenic choice is shown.
5. Confirm attraction and viewpoint markers use only returned source locations; the separate list follows route order and shows only available source name/category/location. Recommendations do not add route waypoints, detours, energy stops, or feasibility. No fixed interval is displayed or applied.
6. If comparable candidates cannot be obtained, verify a plain-language Scenic-unavailable explanation and that Fastest/Shortest remain selectable and usable. Confirm the UI does not label a fallback route Scenic.
7. If comparable candidates have zero tourist POIs, verify Scenic remains available with a zero-attractions message. If the provider limits the POI query, verify Scenic still displays and explains incomplete attraction coverage.
8. Verify provider errors, no-road-route errors, and 007 incomplete energy feasibility remain separate states. Retry/correction preserves trip inputs; no raw provider response, key, or stack trace appears.
9. Change to a narrow viewport and use only the keyboard. Check the Generate routes action, named route cards, labels, loading/error announcements, map controls, and persistent visible OpenStreetMap attribution. Check that no tile prefetch or offline download behavior is introduced.

## Known service limits and how to interpret Scenic

- ORS public Directions supports driving routes up to 6,000 km. Its alternative/round-trip option is limited to 100 km and at most three alternatives; it may return fewer. Long-trip Scenic therefore also requests a complete route with highways avoided and compares it with Fastest/Shortest and any alternatives actually returned.
- For Scenic tourist POIs only, the backend adapts the query buffer per full candidate: `min(configured corridor, 2,000 m, 25,000,000 / projected route length in metres)`. This keeps the estimated area within 50 km2 while preserving the configured corridor for 007 fuel and charging searches. A narrower search can omit attractions farther from long routes. Do not split the route. Full route linestrings over 500 km remain Scenic-unavailable.
- OpenPOIService public limits include a 500 km maximum linestring length, 50 km² maximum query area, and 2 km maximum search radius. The existing app also uses a configurable POI corridor and a default result limit of 50. A geometry/query outside supported limits, or a result list that may be truncated at the configured limit, makes the Scenic comparison unavailable; it must not cause route splitting. Fastest and Shortest remain usable.
- Category data is OpenStreetMap-derived and can be missing or incomplete. The counted score is the number of distinct source POI features returned for IDs 622 and 627 under the configured query/cap, not a verified count of every real-world attraction. The app must not invent descriptions, ratings, opening hours, or availability.
- When ORS returns only one distinct complete candidate, the Scenic choice reuses that geometry and shows a notice that no distinct alternative was available. When every comparable candidate has zero POIs, the combined `all` request keeps Scenic available with zero attractions; Fastest/Shortest remain usable. POI provider limits also retain a Scenic route with a coverage notice.
- All trip previews remain transient. Do not add saved routes or history; that work belongs to Feature 009.

## Automated checks

Implementation tasks define the backend and Playwright checks. Run them only after the feature is implemented and use the commands and real-provider scenario configuration from the 007 quickstart. Run live-provider scenarios sequentially to respect provider quotas. Do not mock providers, intercept `/trips` calls, commit test credentials, or assert fixed attraction/station names, exact POI counts, or fixed route geometry.

See [008 API contract](contracts/trips-api.md), [008 UI contract](contracts/trips-ui.md), [008 research](research.md), and the [007 API contract](../007-trip-planning-dashboard/contracts/trips-api.md).
