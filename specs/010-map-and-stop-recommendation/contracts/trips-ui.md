# Trip Planning UI Contract: Feature 008 Extension

## Existing 007 behavior retained

The signed-in planner stays at `/trip` in the existing account layout. Keep 007 navigation, origin/destination autocomplete and current-location action, owned-vehicle selector, current fuel/battery input, favorites, explicit preview action, responsive client-only Leaflet map, visible OpenStreetMap attribution, route details, and range-aware fuel/charging stop list. The 007 UI contract remains applicable except for the extensions below.

All trip data shared by the planner, map, option selector, and summary belongs in the existing trips Redux state. Component-local state may hold only short-lived control details. Use the existing MUI theme and credentialed API client; do not call ORS/OpenPOIService from the browser.

## Route generation and canonical choices

- Do not ask the user to choose a preference before requesting routes. The single **Generează rutele** action requests canonical Fastest, Shortest, and Scenic choices together.
- Show available results as accessible selectable cards labelled **Fastest**, **Shortest**, and **Scenic**. If two labels resolve to one geometry, show one card with both labels. Never show numbered ORS candidates.
- ORS alternatives may be used internally to identify the Scenic candidate, but only canonical choices are user-visible. If multiple candidates tie for the highest attraction count, use the quickest tied candidate as the single Scenic choice.
- While generation is pending, expose a visible and screen-reader-announced busy state, prevent duplicate submission, and preserve all inputs.
- Selecting a generated card is local and does not call the provider again. Starting a new generation exposes a visible and screen-reader-announced busy state, prevents duplicate submission, and preserves inputs.
- On success, show the selected preference with the route geometry, distance, driving duration, legs, feasibility, and stops from that same response option.

## Scenic candidate options

- Show each canonical choice's distance, estimated driving duration, and route feasibility. Scenic also shows its attraction count.
- Selecting a card changes the map geometry, metrics, legs, feasibility, 007 energy stops, and attractions together using that option object already in Redux; it does not trigger another provider call.
- Fastest and Shortest present their single returned route option and do not display attraction recommendations as energy stops.
- If Scenic candidates cannot all be compared, keep Scenic available using the best checked candidate, or Fastest if none could be checked, and explain the limited POI coverage. If ORS provides only one geometry, reuse it and explain that no distinct alternative was returned.
- If candidate POIs are successfully compared but all counts are zero, Scenic is still a valid result; show the route and energy plan with a clear “No tourist attractions found along this route” empty state.

## Map and ordered recommendations

- Extend the existing map; do not add another map or change configured tile source. Keep visible, unobstructed OpenStreetMap attribution and existing tile-policy behavior.
- Show the selected route option's geometry, origin, destination, and 007-compatible energy-stop markers. Show tourist POIs with a distinguishable marker style and accessible marker text. Tourist markers are informational and never appear in the energy-stop count.
- Show attractions in a dedicated list separate from fuel/charging stops. List order follows route progress from origin to destination. Display only source-provided name, category, and location; omit absent optional detail. Do not invent descriptions, ratings, opening hours, availability, or visit status.
- Show route-relative progress as distance along the selected route from its origin when available. Explain that attractions are recommendations beside/along the route and are not mandatory waypoints or detours. Do not state that the user must stop at them or has visited them.
- Do not show a fixed driving-time or distance interval between attractions. Do not space, filter, or sample attraction markers/list items based on an interval.
- Switching Scenic candidate options updates geometry, metrics, feasibility, energy stops, attraction markers, and attraction order together. The map and both lists must never combine different option results.

## States and recovery

Keep the following states distinguishable and preserve planner inputs where correction/retry is possible:

| State | UI behavior |
|---|---|
| Initial/no preview | Existing planner controls and vehicle/range state are available; no stale map/result is presented as current. |
| Loading preview | Visible and assistive-technology announced progress; disable duplicate submit. |
| Fastest/Shortest success | Identify the preference and render its own route, existing 007 energy stops, metrics, and feasibility. |
| Scenic success with attractions | Render the selected candidate and show matching attraction markers and the separate ordered attraction list. |
| No attractions found | Keep Scenic available with an explicit zero-attractions message; keep Fastest/Shortest results and their energy plans usable. |
| Limited Scenic comparison | Keep the route available; explain if ORS supplied no distinct alternative or the POI source could not evaluate every candidate. |
| Provider/API error | Show a safe, plain-language error and retry action. Do not expose upstream messages, key, headers, or stack trace. |
| Incomplete energy feasibility | Preserve 007's explicit incomplete state and unreachable-leg explanation. Keep it visually distinct from attraction/provider errors. |
| No road route | Show the no-route state; clear stale route geometry and metrics. |
| Session expired | Existing auth-cleared behavior clears account-scoped trip state and redirects to sign-in. |

All controls and option selectors have persistent accessible labels, keyboard operation, visible focus, and appropriate status/alert semantics. Preserve desktop and narrow-screen usability without obscuring route inputs, result controls, or map attribution.

## Scope exclusions

No turn-by-turn navigation, attraction booking/visitation, fixed attraction interval, attraction dwell-time estimate, provider-switch control, saved trip, trip history, or persistence is added. Feature 009 owns future history requirements.
