# Admin Dashboard UI Contract

**Status**: Target UI contract. Field-level producer validation and Playwright verification remain pending as tracked in [tasks.md](../tasks.md).

## Routes and Role Access

- `/admin`, `/admin/users`, `/admin/vehicles`, and `/admin/producers` are protected routes with a dedicated admin layout, outside the `(account)` route group.
- The ordinary application navigation does not contain an Admin destination. The admin layout provides Overview, Users, Vehicles, and Producers links and marks the active section with `aria-current="page"`.
- The admin layout provides an MUI light/dark mode switch. The selection is saved in local storage under `drivewise-admin-theme` and reused across admin routes and reloads.
- On a missing/expired session, route to `/login`. An authenticated non-admin is routed to the existing `/trip` application page. Regardless of this presentation, admin API requests are enforced by the backend.
- No admin destination or user/producer management controls are added to the sign-in, registration, or profile forms.

## Shared Section Layout

`/admin` Overview shows section totals and charts for user account status, vehicle type, and producer brand based on existing statistics responses. Each summary card links once to its section. Each collection section shows a title, global statistics, filters/sort controls, the current page of its table, and pagination controls. Statistics do not change when table filters or page are active. Filters and sort can be active together and can be cleared without losing the global counts. The UI fetches only the current page; filtering, sorting, and paging are applied by the API before rows are returned.

| Section | Table fields and controls | Statistics |
|---|---|---|
| Users | Name, email, status, created date. Filter by name, email, status, and creation date; sort by name, email, and creation date. Only ordinary-user accounts are shown; disabled users remain visible. | Total users; active count; disabled count. |
| Vehicles | Name, model, type, year, range, mileage, fuel type, created date. Filter by name, model, type, year, range, mileage, and fuel type; sort by these fields and creation date. No row actions. | Total vehicles; combustion count; electric count. |
| Producers | Name, email, brand, status, created date. Filter by name, email, brand, status, and creation date; sort by name, email, brand, and creation date. | Total producers; count for each brand, with missing brands grouped as "No brand". |

Text filtering is case-insensitive. Enum fields use their available values; numeric and date filters use their corresponding values/ranges. Sort order has ascending and descending choices and a clear default indicator. The exact field widgets follow MUI and existing project UI patterns.

## Pagination

- Requests default to page 1 with 25 rows. The page-size selector offers 10, 25, and 50; the API accepts up to 100 rows per request.
- Show the current page, total matching rows, and previous/next controls; disable navigation when there is no previous/next page. If no rows match, show the no-matches state and no active page results.
- Changing a filter, sort key/order, or page size resets to page 1. Changing only the page preserves filters and sorting.
- Global statistic cards do not change when the current page or filters change. Pagination's matching-row total follows the active filters.
- After successful create/deactivation, refresh the current request and global statistics. If the current page becomes invalid after deactivation, move to the last available page.

## User Deactivation Flow

1. Administrator selects the delete action on an ordinary-user row.
2. An accessible confirmation dialog identifies the selected user and explains that the account will be disabled and can no longer sign in. It offers Cancel and Confirm.
3. Cancel closes the dialog without a request or data change.
4. Confirm submits the explicit `DELETE` confirmation through the shared API client with CSRF.
5. On success, the account remains in the Users list with disabled status, the active/disabled counts update, and an accessible success status is shown.
6. On failure, the row and counts remain unchanged; show the section's safe error alert with a collection retry action. The deactivation request itself is not automatically retried.

## Add Producer Flow

- Form fields: required name, brand (free text, maximum 120 characters as enforced by the API/model), email, password. Fields appear in a dialog only after Add producer is selected.
- Show the existing password requirements: at least 8 characters, one uppercase letter, one number, and one special character. Never show the password after submission and clear it after a successful create.
- Frontend validation mirrors the API rules: name and brand are required trimmed values of 1–120 characters, email must be valid, and password must be at least 8 characters with an uppercase letter, a number, and a special character. Show actionable English errors beside invalid fields. Map safe backend `details[].location` entries to the corresponding field and map `email_unavailable` to Email. Use a generic safe form-level message when an error cannot be mapped; do not render raw server details or the password. On submission failure, keep the dialog and entered form values available. On success, clear the password and reset the form. Do not automatically retry a create request.
- On success, close or reset the form, add/refresh the producer row and global statistics, and announce confirmation through an accessible status message.

## Loading, Empty, and Error States

- Initial request: visible progress/loading text announced with `role="status"`; do not briefly present “no records” as if the request had succeeded.
- Successful zero-row collection: section-specific empty state and a relevant next step (Add producer on Producers; no create action for Users/Vehicles).
- Active filters with zero matches: distinct “no matching results” state and a clear-filters action.
- Read failure: safe `role="alert"` and Retry action; existing rows may remain visible if a refresh fails.
- Mutation failure: safe actionable alert associated with the active dialog/form; no stale success state.
- Empty data and errors never include passwords, verifier material, session IDs, or database details.

## Responsive and Accessible Behavior

- Use MUI Table and existing responsive layout patterns; tables remain readable at narrow screens (horizontal overflow or another accessible narrow-screen layout).
- All filters, sorting controls, links, and actions have visible labels and keyboard focus. Dialog focus enters the dialog and returns to its trigger when closed.
- Use accessible names, `aria-current` on navigation, `role="status"` for progress/success, and `role="alert"` for failures. Preserve visible focus styling and sufficient contrast consistent with AppNavigation.
- Admin page labels, status text, errors, and actions are in English.

