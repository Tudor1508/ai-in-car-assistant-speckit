# Drive Wise Frontend

The frontend uses Next.js 16 App Router, React 19, TypeScript, Redux Toolkit,
MUI 9, Leaflet 1.9, and React Leaflet. The signed-in trip dashboard is `/`; the
profile and vehicle manager remain available at `/profile` and `/vehicles`.
Trip API calls use the credentialed shared client. The map is loaded client-side
and uses the configured tile URL with visible attribution.

## Setup and run

Prerequisites: Node.js 20.9+ and npm. From `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Configure `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MAP_TILE_URL`,
`NEXT_PUBLIC_MAP_ATTRIBUTION`, the frontend host/port, and Playwright base URL
in `.env.local`. Add the same
non-secret `TRIP_TEST_*` scenario inputs used by the backend tests. The map tile
URL and attribution are public configuration; ORS credentials do not belong in
the frontend environment.

```powershell
npm run dev -- --hostname $env:DRIVE_WISE_FRONTEND_HOST --port $env:DRIVE_WISE_FRONTEND_PORT
```

The backend must allow the frontend origin and its API URL must point to the
configured backend. See the [Feature 007 quickstart](../specs/007-trip-planning-dashboard/quickstart.md)
for the full startup order.

## Verify

```powershell
npm run type-check
npm run build
npx playwright install chromium
npm run test:e2e
```

Trip browser scenarios use the running frontend, backend, live ORS service, and
configured map tiles without endpoint interception or provider mocks. The map
does not prefetch tiles outside its visible viewport. OSM attribution remains
visible. Users enter locations in plain text fields; the frontend resolves
them through the backend place-search API when requesting a route preview.
