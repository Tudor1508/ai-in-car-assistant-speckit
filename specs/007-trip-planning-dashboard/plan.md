# Implementation Plan: Trip Planning Dashboard

**Branch**: `007-trip-planning-dashboard` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: [Feature specification](spec.md), project constitution, and Feature 006 vehicle-management contracts.

## Summary

Add an authenticated trip-planning dashboard as the primary post-login page. Reuse the owned vehicle list, collect current fuel/battery percentage, resolve origin and destination, calculate an OpenRouteService driving route, and iteratively include compatible OSM fuel/charging stops when range requires them. Persist only account-owned favorite endpoints; keep current trip drafts and route previews transient. All provider requests and the ORS API key remain in the backend.

## Technical Context

**Language/Version**: Python 3.11–3.13; TypeScript with Node.js 20.9+ and React 19.3.0.

**Primary Dependencies**: Existing FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, Next.js 16.3.7, Redux Toolkit 2.13.0, React Redux 9.3.0, and MUI 9.4.0. Promote existing `httpx==0.28.1` from test-only to runtime. Add `leaflet==1.9.4`, `react-leaflet==5.0.0` (verified React 19 peer compatibility), and a compatible pinned `@types/leaflet`; update `package.json` and `package-lock.json` together.

**Storage**: Existing SQLAlchemy/Alembic boundary and local SQLite. Add one account-owned favorites table; route previews, station recommendations, and in-progress inputs are not persisted.

**Testing**: Backend `python -m compileall src` and `python -m pytest`; frontend `npm run type-check`, `npm run build`, and `npm run test:e2e` against the actual frontend, backend, and ORS service. Integration tests require a valid locally configured ORS credential and environment-supplied route/vehicle inputs. Do not mock providers/endpoints or embed fixed test locations, coordinates, ranges, or station responses.

**Target Platform**: Existing local contributor environment (Python 3.11–3.13, Node.js 20.9+, npm); browser-based responsive web app.

**Project Type**: Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: Meet spec SC-001: a user with a vehicle can preview a route in under two minutes without assistance. Location suggestions are debounced and provider calls have configured timeouts; no unverified latency SLA is introduced.

**Constraints**: Keep the ORS key server-side. Require API base URLs, allowed origins, provider endpoints, limits/timeouts, POI corridor, maximum stop count, test locations/ranges, and map tiles through environment configuration; remove source-coded fallbacks for frontend API URLs and backend allowed origins. Do not add hardcoded credentials, locations, coordinates, route responses, or mocks. Use existing authenticated account and CSRF dependencies for preview and favorite creation; preview consumes provider quota even though it does not persist a trip. Derive selected vehicle range/type from an owner-scoped backend lookup rather than trusting client vehicle fields. Preserve existing profile, vehicle, auth, and sign-out behavior. Show visible OSM attribution, respect tile caching and Referer policy, and do not prefetch/offline-download tiles. OSM station records do not guarantee live availability or completeness.

**Scale/Scope**: One primary authenticated dashboard at `/`, one favorite-route entity and migration, one trip API router for place suggestions, route preview, and favorite list/create, one client-only map, and focused API/component/browser coverage. No trip history, analytics, alternate route styles, or stop editing UI.

## Design Decisions

- Replace the currently empty `/` page with the account-layout trip dashboard. After login, navigate to `/`; retain `/profile` and `/vehicles` unchanged and add the dashboard to shared navigation.
- Add authenticated `GET /trips/places`, CSRF-protected `POST /trips/preview`, `GET /trips/favorites`, and CSRF-protected `POST /trips/favorites`. Preview is not persisted but consumes provider quota. Every operation requires an active account.
- Use ORS Pelias autocomplete, directions, and OpenPOI from one backend provider adapter. Validate and normalize external responses before returning application contracts; translate provider timeout, rate limit, malformed response, and no-result cases to safe error/status results.
- Start with a direct driving route and query compatible station POIs around its geometry. Iterate from origin to destination: use `vehicle.range_km * current_level_percent / 100` for the initial leg, then `vehicle.range_km` after each planned stop, assuming the driver restores the vehicle to full range at each stop. Candidate legs include road detours; choose a reachable station that makes forward route progress. Recheck candidates along updated route geometry, respect a configured maximum stop count, and recalculate final directions through the ordered stops. If no feasible candidate exists, return a clear incomplete-range result instead of claiming the route is complete. Estimates do not guarantee real consumption or station availability.
- Persist selected place labels and coordinates with favorites. Saving identical endpoints is idempotent per account. Selecting a favorite fills both location fields but does not automatically preview.
- Keep shared trip inputs, place suggestions, favorites, route geometry, and UI request status in a trip Redux slice; components own only short-lived UI details such as open menus. Clear account-specific trip state on `authCleared`.
- Add `backend/.env.example` entries for server-side ORS, allowed-origin, and live-test configuration and a `frontend/.env.example` for required public API/map/test-server configuration; local `.env` files remain ignored. Examples contain replace-me placeholders only. Remove source-coded localhost fallbacks from `frontend/src/lib/api/client.ts` and `backend/src/auth/config.py`. The supplied key is exposed and must be rotated before local use; never add it to repository files.
- Use Leaflet/React Leaflet in a client-only map component with MUI controls. Keep base tile URL configurable and attribution persistently visible. Provide route line, origin/destination markers, station markers, and leg/total summaries.

## Constitution Check

*GATE: Evaluated before Phase 0 research and again after Phase 1 design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Frontend owns user interaction, Redux coordination, and map rendering. Backend owns validation, favorite persistence, provider calls, range feasibility, and authorization through explicit contracts. | PASS |
| II. Compatible, Reusable Frontend | Reuse current React/TypeScript/Redux/MUI versions. Add only the map packages needed; keep map, place field, vehicle-range control, favorite list, and summary responsibilities focused. | PASS |
| III. One Authority for Shared Client State | Redux owns trip/favorite data shared between planner controls and results; no competing shared copies. Backend remains authoritative for vehicles and favorites. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Document API request/response/error schemas. Owner-scope vehicle/favorite access. Keep credentials out of source, browser bundles, responses, and committed examples. | PASS |
| V. Verified, Accessible User Outcomes | Plan live frontend/backend/provider integration, authorization, real provider error/no-station scenarios, migration/persistence, keyboard/mobile map controls, and regression checks for existing workflows. | PASS |
| SDD development and review | This plan traces feature requirements into model, contracts, quickstart, and subsequent task generation. | PASS |

No gate violations or exceptions are proposed.

## Project Structure

### Documentation (this feature)

```text
specs/007-trip-planning-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── trips-api.md
│   └── trips-ui.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.py                              # Mount authenticated trips router
│   ├── trips/
│   │   ├── routes.py                        # Places, preview, favorites endpoints
│   │   ├── schemas.py                       # Validated request/response models
│   │   ├── service.py                       # Owner checks, range-aware stop planning
│   │   ├── provider.py                      # ORS geocode, directions, POI adapter
│   │   └── settings.py                      # Environment-backed provider settings
│   └── data/models/
│       ├── trip_favorite.py                 # Account-owned favorite route
│       └── __init__.py                      # Register model with Alembic metadata
├── migrations/versions/0004_trip_favorites.py
├── tests/
│   ├── test_trip_places.py
│   ├── test_trip_preview.py
│   ├── test_trip_favorites.py
│   └── test_trip_provider.py
├── .env.example
└── requirements.txt                         # Add runtime httpx pin

frontend/
├── src/
│   ├── app/(account)/page.tsx               # Authenticated / dashboard
│   ├── app/(account)/layout.tsx             # Existing account shell
│   ├── components/AppNavigation.tsx          # Add Plan a trip destination
│   ├── features/auth/components/LoginForm.tsx # Navigate to / after login
│   ├── features/trips/
│   │   ├── tripsApi.ts
│   │   ├── tripsSlice.ts
│   │   └── components/
│   │       ├── TripPlanningDashboard.tsx
│   │       ├── PlaceAutocomplete.tsx
│   │       ├── VehicleRangeControl.tsx
│   │       ├── RouteMap.tsx
│   │       ├── FavoriteRoutes.tsx
│   │       └── RouteSummary.tsx
│   └── lib/store.ts                         # Register trip reducer
├── tests/
│   ├── trip-planning.spec.ts
│   └── trip-favorites.spec.ts
└── .env.example
```

**Structure Decision**: Extend the established two-project web app and its existing feature-module/API boundaries. Reuse account and vehicle modules, place the dashboard at the empty root route under the authenticated route group, and keep external-service logic in a backend provider adapter. The root page currently returns `null`; replace it with the account-group route and remove the duplicate root page file to preserve a single `/` route.

## Post-Design Constitution Check

| Principle | Design evidence | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | [trips-api.md](contracts/trips-api.md) assigns external calls and authoritative range calculations to backend; [trips-ui.md](contracts/trips-ui.md) defines presentation states. | PASS |
| II. Compatible, Reusable Frontend | Existing app stack remains; exact lock data is updated with Leaflet/React Leaflet and typings. | PASS |
| III. One Authority for Shared Client State | Redux trip slice holds cross-component trip and favorite view state; persistence remains in backend. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | All route/favorite endpoints require active account; vehicle ID is looked up by owner; favorites are owner-scoped; ORS secret is server-only. | PASS |
| V. Verified, Accessible User Outcomes | [quickstart.md](quickstart.md) defines configured live-provider integration, authorization, route/stops, failure, browser, keyboard, and regression checks. | PASS |
| SDD development and review | Contracts, data model, and quickstart map to spec stories and requirements. | PASS |

No constitution exception is proposed.

## Complexity Tracking

No constitution violations or new services are proposed. The one additional map dependency pair and one backend HTTP client are necessary for interactive OSM maps and the required server-side provider integration.
