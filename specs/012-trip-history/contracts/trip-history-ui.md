# Trip History UI Contract

## Route and navigation

- Authenticated account destination: `/trips`. Replace its current redirect to `/trip` with the history page. Keep Trip Plan at `/trip`.
- Add **Trip history** to existing `AppNavigation`; expose its active state on `/trips`. Keep My vehicles, Profile, and Log out unchanged.
- Load the authenticated history API on page entry. On `401`, clear account-specific state and follow the current session-expired redirect to `/login`.

## Trip Plan save flow

- A successful preview remains transient. Show **Save trip** for the currently selected available route option; do not save on preview or favorite save.
- Save the selected route option's exact route, feasibility, vehicle range summary inputs, legs, stops, and selected scenic POIs with its origin/destination, vehicle ID, current level, and selected preference.
- Disable duplicate submission while saving; announce success. On a recoverable failure, show a plain-language message and preserve the selected route so the user can retry.
- Saving an incomplete option is allowed after explicit user action. Preserve and clearly display its incomplete status in history.

## History page

- Use `docs/reference-ui/trip_history.png` as the primary visual reference. Match its hierarchy and current DriveWise dark palette: small cyan overline, large **Trip history** heading, short introduction, three aggregate cards, sort selector, journey count, and stacked rounded trip cards with cyan accent edge. Reuse existing components, design tokens, responsive patterns, and architecture rather than reproducing the image without regard to project conventions.
- Summary cards show journey count, total distance, and estimated driving time over the complete history. Do not show estimated cost because no supported cost model or saved estimate exists.
- Each card shows its stable trip identifier, origin → destination, localized planning timestamp, distance, driving duration, vehicle snapshot, selected route type, and incomplete warning where applicable. Use clear labels and no fabricated values.
- Every trip in the current page includes its corresponding route map. Reuse dynamically imported `RouteMap` with saved route snapshot, origin, and destination. Keep route coordinates in `[longitude, latitude]` form for the existing component, which converts them for Leaflet. Show saved line, origin/destination markers, stops and optional scenic POIs, incomplete-range overlay, fitted bounds, configured tile URL, and visible attribution.
- Keep map regions a fixed compact responsive height while waiting for an `IntersectionObserver` threshold to mount each client-only map. The placeholder occupies the same height. If geometry is unavailable or invalid, keep the details visible and show a map-unavailable message; never request a replacement route.
- If configured map tile/provider requests fail, keep origin, destination, date, distance, duration, vehicle, route type, and any cost value supported by the domain visible and usable (the current domain has no cost value to display) and show a clear, non-blocking fallback/error state inside that map area. The card and page remain usable; do not switch to another provider. Reuse existing error presentation conventions where possible. This failure state is distinct from missing or corrupt saved geometry.
- Default page 1, 10 rows, newest first. Provide newest/oldest selection. Changing order resets to page 1; previous/next preserves sort. Clearly state current page when multiple pages exist; disable controls while loading and at their bounds. Hide pagination for zero or one page.
- Provide page-level loading, empty, error/retry, and page-loading behavior. A failed page request retains the selected sort and permits retry. Empty history shows an encouraging no-trips message without fixture/mock trip cards.
- Responsive: metrics wrap from three columns to a narrow stack; card detail fields reflow; map fills card width; pagination stacks or wraps; navigation follows current small-screen wrapping. All controls have persistent accessible labels and keyboard operation. Announce asynchronous status/errors.
