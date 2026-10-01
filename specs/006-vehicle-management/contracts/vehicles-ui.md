# Vehicle Management UI Contract

**Status**: Proposed for implementation. Visual reference: [`my_vehicles.png`](../../../docs/reference-ui/my_vehicles.png).

## Routes and access

- `/vehicles`: authenticated personal garage and vehicle-management page.
- `/profile`: existing authenticated profile page.
- Both authenticated destinations use one shared App Router account layout and one reusable navigation component. The route group does not change their URLs.
- `/login` and `/register` remain outside the authenticated layout. When a page's current-account request finds no active session, clear safe account state and redirect to `/login`; backend authorization remains authoritative.

## Navigation

- Show the application identity and links to the currently implemented authenticated destinations: **My vehicles** and **Profile**. Highlight the active destination and set `aria-current="page"` on its link.
- Keep the bar visible and consistent across `/vehicles` and `/profile`; do not duplicate it inside page content.
- On narrow viewports, preserve access to both destinations without horizontal page scrolling. Provide visible focus, keyboard operation, and accessible link names.
- Do not add Plan a trip or Trip history links until those destinations exist in the application. The screenshot informs appearance but does not add these separate workflows.

## My vehicles page

- Use the shared dark navy/cyan visual theme and the screenshot's garage heading, vehicle overview, add action, and grouped vehicle cards as inspiration. Adapt card layout to available width.
- Show the vehicle name and model, type, year, range in km, mileage in km, and fuel type; show “Not applicable” for electric fuel type.
- The garage overview shows the number of vehicles and a labeled Add vehicle action.
- Empty state explains there are no vehicles and offers Add vehicle. Loading and recoverable list errors have status/alert semantics; retry does not discard unrelated state.
- Add and edit use a labeled form with all contract fields and type-specific fuel behavior. Display safe field errors adjacent to the corresponding controls and preserve non-secret valid input after failure.
- Delete opens a confirmation dialog identifying the vehicle. Confirm deletes it; cancel closes the dialog without changing the record. Return focus appropriately when the dialog closes.
- Disable duplicate submission while an operation is pending. On success, update the Redux-owned list. On failure, retain the current list and show an understandable message with a retry path where appropriate.
- All controls are operable by keyboard, have visible focus and accessible names, and remain usable at narrow and wide supported widths.

## Shared state and API boundary

- The vehicle collection is shared application state in the vehicles Redux slice. Forms, open dialog, selected record, and pending state local to one interaction remain component-local.
- Vehicle API calls use the shared API client so credentialed fetch, CSRF, `{data}` unwrapping, and safe errors follow existing behavior.
- Do not persist session identifiers, cookies, or CSRF tokens in Redux or browser storage.
