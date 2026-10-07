# Implementation Plan: Map and Stop Recommendations

**Branch**: `010-map-and-stop-recommendation` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: [Feature specification](spec.md), Drive Wise constitution, and the implemented 006 vehicle-management and 007 trip-planning feature, contracts, and code.

## Summary

Extend the existing authenticated 007 trip preview with an optional route preference. Preserve the exact 007 request behavior when the field is omitted. The planner requests Fastest, Shortest, and Scenic together and lets the driver switch between available canonical results locally. Keep its existing map, route summary, Redux state flow, range calculation, compatible fuel/charging stop recommendations, and incomplete-feasibility behavior. Scenic returns a separate collection of informational tourist POIs rendered on the existing map and a separate ordered recommendation list; they do not alter route geometry, metrics, or energy feasibility.

The 007 plan explicitly excluded alternate route styles; its request contract has no preference and its response stop type is limited to `charging` and `fuel`. Current code likewise requests one directions result and has no route preference or tourist attraction behavior. Therefore 010 adds the optional preference and distinct attraction collection once to the existing `/trips/preview` flow; it does not duplicate the 007 planner or claim the new behavior is already implemented. The approved integrations are only the existing ORS and OpenPOIService; reference images and README do not expand their documented capabilities.

**Implementation Gate**: Product decisions are resolved: use only existing ORS and OpenPOIService; Fastest/Shortest minimize estimated drive duration/distance; Scenic selects the complete route(s) with the most distinct `attraction`/`viewpoint` POIs among routes ORS provides. For long trips compare Fastest and Shortest and include alternatives only if returned by ORS. When candidates tie for Scenic, choose the quickest tied route. Always surface three separately selectable choices, Fastest, Shortest, and Scenic, even when their geometries match; never expose numbered provider alternatives. If no attractions are found or comparison is limited, Scenic remains available with zero attractions or a coverage notice. This is not a global optimum guarantee. Do not compose segments or add providers. Scenic display recommendations are sampled at no more than one per 100 km route section, after the first 10 km, and kept 10 km from mandatory energy stops and one another. The revised all-routes request and canonical-choice behavior supersede the earlier preference-radio design.
## Technical Context

**Language/Version**: Existing project baseline from 007: Python 3.11–3.13; TypeScript, Node.js 20.9+, React 19.3.0.

**Primary Dependencies**: Reuse the existing FastAPI 0.115.6, Pydantic 2.13.5, Next.js 16.3.7, Redux Toolkit 2.13.0, React Redux 9.3.0, MUI 9.4.0, Leaflet 1.9.4, React Leaflet 5.0.0 and current project dependencies declared in the 007 plan/lockfiles. No dependency addition is planned.

**Storage**: None for this feature. Route previews, selected preference, and attraction recommendations remain transient as in 007. Do not add schema migrations or persistence; trip history belongs to 009.

**Testing**: Plan contract validation and focused backend/service, Redux/component, and browser coverage for all three preferences, tied Scenic candidates, combined attraction and energy-stop ordering, complete/incomplete range plans, no attractions, unavailable Scenic candidates, no route, provider failures, stale generation prevention, loading states, authorization, keyboard access, and responsive layout. Keep live integration tests for configured providers; deterministic edge cases may use synthetic geometries and simulated provider responses in tests only. Do not add runtime providers or fixed live test locations. Planning does not run tests.

**Target Platform**: Existing local contributor environment and browser-based responsive application.

**Project Type**: Existing Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: Meet the observable behavior in spec.md. No new latency SLA is set before the routing and attraction data sources and their quotas are decided.

**Constraints**:

- Preserve 007 authenticated API access, CSRF/origin validation, request validation, account-scoped vehicle lookup, safe error envelope, provider-secret isolation, map tile configuration/attribution/policy, and existing route/stop behavior.
- Keep backend authoritative for route selection, route/stop metrics, and range feasibility; keep UI rendering and interaction in the existing frontend trips feature.
- Use Redux for generated route choices, selected result, preview data, and request status shared across planner/map/summary components. Component-local state may contain only transient local interaction details.
- Do not add or assume a routing provider, map provider, external service, algorithm, data contract capability, dependency, or detour/interval rule not established by project decisions. Tourist POI categories are the confirmed `attraction` and `viewpoint` categories when available through the existing source.
- Preserve Fastest and Shortest compatible energy stops and existing 007 full-range-at-each-stop assumption. Scenic must also retain energy feasibility and stops, as an explicit continuity assumption in the spec.
- For Scenic only, reduce the tourist OpenPOI query buffer as needed to fit the public 50 km² area limit. Derive the buffer from each candidate's projected route length and cap it at both the existing configured corridor and the public 2 km search radius. Do not alter the configured buffer for fuel/charging POIs. Do not split routes; complete linestrings over 500 km remain Scenic-unavailable.
- Keep history, saved trip results, analytics, and persistence out of 010; 009 owns those decisions.

**Scale/Scope**: One extension of the existing authenticated `/trip` dashboard and `POST /trips/preview` contract; one route result with separate ordered energy-stop and tourist-recommendation collections; no second map/planner, data store, migration, or history feature.

## Existing Integration and Ownership

| Concern | Current owner/artifact | 010 integration |
|---|---|---|
| Trip preview API and validation | `backend/src/trips/routes.py`, `schemas.py` | Extend the existing preview request/response with an optional validated generation mode and canonical choice identities; omission preserves 007 behavior. Preserve established auth, CSRF/origin, validation and safe error conventions. |
| Route choice, station candidates, range feasibility | `backend/src/trips/service.py` | Extend the current orchestration; route/station decisions remain server-side. Keep compatible charging/fuel selection and 007 range assumptions for each selected geometry. Attraction recommendations remain separate and do not affect this calculation. |
| Provider calls and normalization | `backend/src/trips/provider.py`, `settings.py` | Extend only the existing ORS Directions/OpenPOIService adapter paths according to the approved Scenic candidate policy. Tourist categories are confirmed; no additional service or frontend provider call. |
| Shared trip state/API client | `frontend/src/features/trips/tripsApi.ts`, `tripsSlice.ts` | Add the combined generation request, canonical choice mapping, selected result, and returned unified data to the existing Redux/API flow. |
| Planner controls and result presentation | `TripPlanningDashboard.tsx`, `RouteMap.tsx`, `RouteSummary.tsx` | Reuse the existing form, map, and summary. Add one Generate routes action and selectable canonical route cards, plus a distinct attraction overlay/list separate from energy stops. Keep OSM attribution/tile policy. |
| Vehicles and range inputs | Feature 006 vehicle API/state plus 007 `VehicleRangeControl.tsx` | Reuse current selected owned vehicle and current-level flow. Do not duplicate vehicle data or accept client-supplied authoritative range/type. |
| Persistence/history | 009 future scope | None in 010. If 009 later needs historical reproduction, it may use the selected preference and returned stop identity/snapshot decisions as input; 009 must define persistence. |

## Decisions and Remaining Design Work

### Confirmed decisions

| Concern | Confirmed direction |
|---|---|
| Providers | Use only the existing 007 ORS Directions and OpenPOIService integrations; no new provider/service. |
| Fastest/Shortest | ORS estimated driving duration / distance preference respectively; report unavailable outcomes clearly without silent substitution. |
| Backward compatibility | Add an optional preference to existing `POST /trips/preview`; omission preserves 007 request behavior; document the extended response. |
| Tourist POIs | Use only data returned by OpenPOIService. Display name, category, location only when present. Keep attraction recommendations separate from energy stops, order along route, and do not alter geometry, metrics, or feasibility. |
| Tourist categories and ties | Use `attraction` and `viewpoint` categories when available. Choose the quickest candidate among tied Scenic scores; do not expose provider candidates as numbered options. |
| Energy stops | Existing 007 fuel/charging rules continue independently; scenic POIs do not satisfy or affect range feasibility. |
| Scenic POI search area | Per candidate, use `min(configured corridor, 2,000 m, 25,000,000 / projected_route_length_m)` for the tourist query buffer so the estimated buffered corridor area stays within 50 km². This can reduce POI recall on long trips. The fuel/charging queries keep the configured corridor unchanged. |
| History | No persistence/history in 010; 009 owns it. |

### Resolved decisions

| ID | Decision | Verified constraint / reason | Approved outcome |
|---|---|---|---|
| Scenic candidates | ORS alternative routes are limited to 100 km and at most three alternatives; long-trip alternatives are not guaranteed. | Among complete routes supplied by ORS, compare Fastest and Shortest for long trips and any alternatives ORS returns. Choose the highest-scoring route for Scenic. No global optimum claim, segment composition, or new provider. If POI comparison is limited, retain Scenic with a coverage explanation. |
| Equal counts | Different candidate routes can have the same highest POI count. | Choose the quickest candidate among tied Scenic scores; do not expose provider candidates as numbered options. |
| Attraction density | The previous map showed too many tourist POIs. | Show at most one recommendation per 100 km route section; exclude the first 10 km and keep recommendations at least 10 km from mandatory energy stops and one another. |
| Adaptive Scenic corridor | OpenPOIService/ORS caps POI area at 50 km², while the configured corridor is 1,000 m and caused the configured long route to return `poi_geometry_limit`. | Apply a per-candidate Scenic-only buffer derived from the projected full-route length, capped by the current setting and API radius. Keep station queries unchanged and never split the full route. |

All product decisions are resolved and recorded. The only remaining pre-implementation prerequisites are research and compatible API/UI contract artifacts in tasks T003-T004; they do not require further product clarification.
## Proposed Work Sequence

This is a dependency order. No product decision remains open. Complete and review T003-T004 before implementation.

1. **Finalize design gate**: Complete `research.md`, the compatible API/UI contracts, and `quickstart.md` in T003-T004 using the approved candidate policy, three separate canonical choices, and concise attraction display rule. Re-run constitution gates before implementation.
2. **Contract and backend orchestration**: Extend the existing preview request with an optional preference and document the response; omission preserves current 007 behavior. Map Fastest/Shortest to ORS request preferences. Compare complete ORS candidates for Scenic using distinct POI counts from the confirmed categories. Adapt only the Scenic tourist query buffer per full candidate to fit the 50 km² area limit; keep the fuel/charging corridor, energy stops, route geometry, metrics, and feasibility unchanged. Do not persist results or split routes.
3. **Frontend shared state and control**: Extend existing trips API client and Redux slice; add the three-choice control to current planner; make loading state and preview identity preference-aware; clear or mark stale results after relevant input changes.
4. **Reuse map and summary**: Extend current `RouteMap` and `RouteSummary` with a separate scenic attraction overlay/list, ordered by position along route; display only supplied name/category/location. Keep 007 energy stops and counts separate, retaining route line, metrics, accessible labels, and map attribution.
5. **Verification and regression review**: Cover the spec acceptance scenarios and existing 007 planner/favorites/vehicle/auth paths with the settled real integration strategy; verify accessibility, responsiveness, contract compatibility, backend authorization, secret isolation, and no persistence/history. Record results before acceptance.

## Constitution Check

*Gate evaluated at planning; recheck after the detailed contracts are recorded.*

| Principle | Plan evidence | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Existing backend trip service/provider owns route selection, POI normalization, and range decisions; existing frontend trips module owns interaction/state/rendering. | PASS |
| II. Compatible, Reusable Frontend | Reuse the current React/TypeScript/Redux/MUI and Leaflet components and dependency set. No dependency change is currently justified. | PASS |
| III. One Authority for Shared Client State | Redux remains the shared authority for chosen preference and preview/result status; backend remains authoritative for returned route/stops/feasibility. No competing result copies. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Extend authenticated 007 preview contract with an optional preference while preserving omitted-field behavior; preserve backend validation, owner-scoped vehicle lookup, CSRF/origin enforcement and safe errors. | PASS |
| V. Verified, Accessible User Outcomes | The spec defines route choice, bounded Scenic selection/ties, unavailable candidate, loading/error/empty, and incomplete-range scenarios; verification covers cross-layer behavior, accessibility, and regression. | PASS |
| SDD development and review | Specification and product decisions are recorded. Implementation starts after T003-T004 research and contract artifacts are completed and reviewed. | GATED ON DESIGN ARTIFACTS |

No constitution exception is proposed. The post-design gate cannot pass until blocking decisions and contract changes are documented.

## Project Structure

### Documentation (this feature)

```text
specs/010-map-and-stop-recommendation/
├── spec.md
├── plan.md
├── research.md       # Records the approved ORS/OpenPOI policy and documented limits
├── contracts/        # Define compatible optional-field API and UI behavior in T004
├── quickstart.md     # Record approved integration and local configuration in T004
└── tasks.md          # Dependency-ordered implementation and verification tasks
```

### Existing Source Code (planned extension points; no source edits in this planning stage)

```text
backend/src/trips/
├── routes.py           # Existing authenticated preview endpoint
├── schemas.py          # Existing strict preview and route-stop schemas
├── service.py          # Existing route orchestration and vehicle range-aware energy-stop planning
├── provider.py         # Existing provider adapter boundary; extend according to the approved candidate policy
└── settings.py         # Existing backend configuration boundary; any new settings need approved sources

frontend/src/features/trips/
├── tripsApi.ts
├── tripsSlice.ts       # Shared preference, request status, and preview result
└── components/
    ├── TripPlanningDashboard.tsx  # Existing planner and route preference control
    ├── RouteMap.tsx               # Existing geometry and markers
    └── RouteSummary.tsx           # Existing route metrics, legs, and ordered stops
```

**Structure Decision**: Extend the existing feature modules and contracts in place. 006 remains the authority for account-owned vehicle data; 007 remains the authority for the existing preview, map, and energy-stop flow; 010 adds route preference and Scenic attraction behavior; 009 remains the future owner of trip history/persistence. No duplicate map or route planner is planned.

## Risks and Alternatives

- **Provider cannot satisfy route choices**: The current 007 contract/code only establish a single route result. If an approved capability cannot provide or support each requested preference, product must choose a compliant alternative or revise the spec; the application must not falsely label a substituted route.
- **Attractions are not waypoints**: Display their order relative to the route and only route-relative data supported by the response; do not imply detours.
- **Attraction availability is incomplete**: The source may return no or partial details. The UI must retain the route and energy-stop result and handle missing fields as specified, without fabricated metadata.
- **Energy feasibility follows selected route geometry**: Fastest, Shortest, or Scenic geometry can affect station reachability. Tourist POIs do not add detours or alter geometry. Preserve backend-authoritative feasibility and calculate against the selected route.
- **Contract compatibility**: Strict 007 request validation and the existing two-value stop type make silent additive assumptions unsafe. Decide and document B6 before modifying either client/server contract.
- **Scope creep into history**: 010 remains transient; any saved-result requirements, migrations, retention, and historical reproduction semantics belong to 009.

**Alternative rejected**: Implement an unapproved external provider or a guessed scenic heuristic now. It would convert examples/reference behavior into an unsupported technical decision and could produce a mislabeled route or ungrounded attraction recommendations.
