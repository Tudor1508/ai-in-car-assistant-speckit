# Trip Planning Dashboard UI Contract

## Entry and navigation

- The signed-in dashboard is `/`, rendered inside the existing authenticated account layout.
- Successful sign-in navigates to `/`. Shared navigation marks **Plan a trip** active and continues to expose existing **My vehicles**, **Profile**, and **Log out** actions.
- Signed-out access to `/` redirects to `/login`; an expired session clears account-specific trip state and redirects to sign-in.
- `/profile`, `/vehicles`, registration, sign-in, and sign-out retain existing behavior.

## Planner controls

- Provide separate labeled origin and destination autocomplete fields. Suggestions appear after the configured minimum query length and debounce; users select a suggestion to resolve coordinates.
- Provide **Use current location** for origin. Request browser permission only after an explicit user action; if permission is denied or unavailable, show a recoverable message and leave both fields editable.
- Show the account's own vehicles in a labeled selector. With no vehicles, show a clear empty state and link to My vehicles; do not offer a preview.
- For the selected vehicle, provide a labeled current fuel/battery percentage input constrained to 0–100 and show the resulting estimated current range based on the vehicle's saved range. The vehicle data and type come from the authenticated vehicle API/state, not client-supplied fields to the backend.
- Provide an explicit route preview action. Preserve entered values on validation, provider, timeout, rate-limit, and no-station errors. Disable duplicate submits while a preview is pending.
- Show the account's favorites immediately beneath origin and destination controls. Each favorite can be selected to populate both locations; selection does not automatically preview. Saving is available once both selected endpoints are valid; repeated save shows the existing favorite rather than duplicating it.

## Map and route summary

- Render an interactive, responsive Leaflet map only on the client. Show the origin, destination, ordered compatible stations, and the route line. Keep visible OpenStreetMap attribution linked to its copyright page; attribution must not be hidden by controls or overlays.
- Show total distance and estimated driving time. Show each station's name/type and the distance of the preceding leg. Clearly communicate that driving-time estimates omit charging/refueling dwell time.
- A complete route is visually distinct from an incomplete range plan. An incomplete plan states which leg lacks a reachable compatible station; it is never presented as fully feasible.
- If a station is unavailable in map data, locations do not resolve, no road route exists, or the provider fails, present plain-language feedback with retry/correction. Do not display raw upstream errors or credentials.

## States and accessibility

- Provide initial, loading, populated, empty vehicles, empty favorites, no place suggestions, route success, incomplete range, provider error, and session-expired states.
- Use MUI controls and established theme conventions. Keep labels persistent and controls keyboard-operable; announce asynchronous errors/results using accessible alert/status semantics.
- Maintain usable layout at desktop and narrow mobile widths. The map has a stable responsive height and must not resize or overlap the trip controls/result summary.
- Preserve OSM tile service policy: normal visible-viewport interactive requests only, browser Referer present, no prefetch/offline download behavior, and cache headers not bypassed.
