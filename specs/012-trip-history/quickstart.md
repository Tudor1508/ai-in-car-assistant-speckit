# Quickstart: Trip History

This guide validates the explicit trip-save flow, account-scoped paginated history, summary values, and historical route restoration through the existing frontend and backend. It adds no provider or runtime dependency. Use the existing configured test account, vehicle and named ORS inputs from Feature 007; do not put credentials or fixed real-user data in repository artifacts.

## Configuration and startup

1. Follow the [Trip Planning Dashboard quickstart](../007-trip-planning-dashboard/quickstart.md) to configure the local ignored backend/frontend environment, rotated ORS credential, allowed origins, map tile URL/attribution, and named test inputs.
2. From `backend/`, apply the history migration and start the API:

   ```powershell
   python -m alembic upgrade heads
   python -m uvicorn src.main:app --host $env:DRIVE_WISE_API_HOST --port $env:DRIVE_WISE_API_PORT --env-file .env
   ```

3. From `frontend/`, start the app:

   ```powershell
   npm run dev -- --hostname $env:DRIVE_WISE_FRONTEND_HOST --port $env:DRIVE_WISE_FRONTEND_PORT
   ```

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

The complete Playwright suite follows existing configured live-provider requirements. Focused UI states may use the existing route-fixture pattern; save/reload integration must use the actual configured route preview and backend without intercepting those operations.

## Acceptance walkthrough

1. Sign in and open `/trips`; verify Trip history is active in navigation and the page shows loading then empty state for an account with no saved trips.
2. Open `/trip`, choose valid named origin/destination suggestions, select an owned vehicle/current level, preview, and select a route option. Verify preview alone does not create a history item.
3. Explicitly save the selected route. Verify save feedback and that its chosen preference, distance, duration, feasibility, vehicle snapshot, route geometry, and map metadata are returned/persisted.
4. Return to `/trips` and reload. Verify the card and map reconstruct from persisted route data; route line, endpoints, stops/POIs where applicable, fitted bounds, configured tile attribution, and complete/incomplete status match the saved selected option. Verify history loading does not call the route provider again.
5. Save an incomplete route option explicitly and verify it remains visibly labeled incomplete in history.
6. Save more than ten route records, then verify a maximum of ten per page, current page and totals, next/previous navigation, newest/oldest ordering, stable tie order, sorting retained across pages, and sorting reset to page 1.
7. Sign in as another account and verify empty/private history and zero summary; try history create without CSRF and with a vehicle owned by the first account and verify safe rejection.
8. Verify aggregate count, distance, and driving time cover every owner record, not only the current page. No cost value is displayed.
9. Verify error/retry, out-of-range page correction, unavailable/corrupt map snapshot handling, and a failed configured tile request: the map area shows a non-blocking fallback while trip metadata and the rest of the card/page remain usable, without switching providers. Also verify keyboard navigation, labels/status announcements, and narrow viewport layout.

See [the API contract](contracts/trip-history-api.md), [the UI contract](contracts/trip-history-ui.md), and [the data model](data-model.md) for exact field and state requirements.
