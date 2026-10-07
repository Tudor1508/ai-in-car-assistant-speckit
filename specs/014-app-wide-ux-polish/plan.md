# Implementation Plan: App-wide UX Polish

**Branch**: `014-app-wide-ux-polish`  
**Specification**: [`spec.md`](spec.md)  
**Status**: Implementation plan; OQ-1 and OQ-2 are resolved. Contact/Privacy publication remains gated on owner-approved copy.

## Summary

Polish the existing Drive Wise experience across six connected areas: shared shell and landing, authentication/profile, trip planning/map, vehicles, admin dashboard, and AI Concierge/responsive behavior. Reuse Next.js App Router, React/TypeScript, Redux Toolkit, MUI, FastAPI, the current JSON envelope conventions, and existing feature APIs. Keep changes additive and presentation-focused except for the two explicitly specified owner-scoped mutations: favorite removal and producer deactivation.

Do not change email verification, session revocation, role assignment, routing/recommendation, range calculations, uploaded vehicle-image precedence, or AI Concierge scope. Do not add a UI framework, external service, dependency, invented legal/contact content, or product behavior beyond the specification.

## Existing Implementation and Integration Points

| Area | Existing code and behavior | Planned integration |
|---|---|---|
| Shared shell/theme | `frontend/src/app/layout.tsx` mounts `Providers`; `frontend/src/app/providers.tsx` currently provides a fixed dark MUI theme and Redux store. `AppNavigation.tsx` contains the shared account navigation and sign-out. `admin/layout.tsx` has a separate MUI theme switch persisted in local storage. | Move to one app-wide theme state/provider using the existing MUI theme and the admin preference persistence pattern. Default to dark; preserve the selected mode across reloads/routes. Consolidate admin and shared navigation theme state without weakening admin gating. Keep sign-out request semantics in existing auth APIs. |
| Landing/public pages | `features/landing/LandingPage.tsx` owns the wordmark, CTA, How it works anchor, and footer; its CTA currently links to `/register`, How it works is hidden on narrow screens, and the footer has no destinations. App Router has no Contact or Privacy route. | Update the CTA to `/login`, make How it works visibly keyboard-operable at supported widths, reuse the current Drive Wise wordmark, and add `/contact` and `/privacy` route pages plus footer links. Show only pending-content state until the project owner supplies and approves the copy; do not invent contact or legal content. |
| Auth/profile | `LoginForm`, `RegisterForm`, `ProfilePage`, `ProfileEditor`, `AccountSecurityDialogs`, and `SignOutButton` own current MUI forms and account actions. Register/profile display email-unverified copy; profile role is a read-only `TextField`; profile repeats sign-out. Auth API exposes verification state and feature 005 lifecycle operations. | Improve field/error/pending/focus presentation; remove only the unverified helper/alert copy; show role as static labeled information; remove duplicate profile sign-out; after successful password change/deactivation clear client state and route to `/`. Preserve backend payloads, verification state, failed-operation session state, and existing logout behavior. |
| Trips/map | `features/trips/components/TripPlanningDashboard.tsx`, `FavoriteRoutes.tsx`, `VehicleRangeControl.tsx`, `RouteMap.tsx`, `RouteSummary.tsx`, `tripsApi.ts`, and `tripsSlice.ts` hold planner state and views. Favorites API currently supports list/save only. Range uses `range_km * percentage / 100`. Preview uses the existing POST contract; map is route-preview driven. Trip History already has page state and pagination. | Add owner-scoped favorite removal through existing authenticated JSON/CSRF conventions. Add two-item/Show more list state; after successful deletion from the collapsed list, the next saved route in stable order immediately fills the open slot. Add an accessible visual percentage/range popup without changing the calculation/API meaning. Use `AbortController` if supported by `apiRequest` or a local request generation token to ignore stale preview results; Stop means cancel the client wait only. Improve route-stage hierarchy and show a non-fabricated pre-route map empty state. Preserve existing map/provider attribution and history pagination. |
| Vehicles | `features/vehicles/components/VehicleManagementPage.tsx`, `VehicleForm.tsx`, `vehiclesApi.ts`, `vehiclesSlice.ts`, and `validation.ts` handle garage/forms. Feature 013 owns Commons metadata and private photo upload/content; current validation is in the frontend and backend. Empty garage currently has an Add action in the header and empty state. | Keep one primary Add action when empty. Align client field errors with existing backend limits and the explicit non-negative whole-number rule; do not add uppercase or other arbitrary constraints. Polish MUI dialog hierarchy and narrow layout while preserving feature 013 image preview/upload/retention/discard contracts. |
| Admin | `app/admin/layout.tsx` guards the admin shell and currently owns branding, theme toggle, and sign-out. `features/admin/components/AdminSection.tsx`, `adminApi.ts`, and `adminSlice.ts` own paginated users/producers/vehicles, summary cards, filters, actions, and user confirmation. Backend `admin/routes.py` enforces admin access, provides paginated totals, producer creation/listing, and user deactivation with session revocation; producer deactivation does not exist yet. | Reuse the current wordmark and server-provided stats; add accessible visual accents with labels/icons/text. Add a producer deactivation endpoint and API action following user-deactivation lifecycle (disabled status, revoke active sessions, retain owned data), protected by `require_admin` and CSRF. Add producer confirmation/action states and refresh its list/stats only after success. Preserve filter/sort/page contracts and global totals. |
| Concierge/responsive | `features/concierge/components/TravelConcierge.tsx` implements the chat overlay, text, recording consent, transcription, playback and Stop behavior; account/admin layouts and feature pages use MUI responsive styles. Existing Playwright specs cover feature-level behavior. | Refine spacing, typography, labels, focus, contrast, and breakpoints without changing feature 011 API, audio consent, overlay placement, or audio Stop behavior. Audit all existing routes at the declared Playwright desktop/mobile sizes; use contained overflow only for intrinsically wide tables. |

## Architecture and Contract Decisions

- **Frontend state**: theme selection is shared across routes, so use one Redux-owned preference with a hydration-safe dark default and persistence through the existing browser storage approach. Component-local state remains appropriate for open dialogs, Show more, and gauge interaction. Avoid separate competing admin/global theme state.
- **MUI theme**: extend the current `createTheme` palette for light and dark modes. Replace hard-coded shell/surface colors only where required for correct mode contrast; do not redesign business content or add a design system dependency.
- **Favorite deletion**: add `DELETE /trips/favorites/{favorite_id}` as an account-authenticated, CSRF-protected, owner-scoped operation. Follow the existing success/error envelope and not-found ownership conventions. When a visible favorite is deleted successfully from the collapsed list, immediately fill its slot with the next saved favorite in stable list order, if one exists. Keep at most two visible until “Show more”; if fewer than two remain, show all remaining routes. On failure, retain the item for retry.
- **Preview cancellation**: inspect `apiRequest` signal support first. If supported, pass an `AbortSignal`; otherwise use an incrementing request token to invalidate results. In either case, cancellation stops waiting/committing in the browser only. Do not add a server/provider cancellation promise or change route algorithms.
- **Producer deactivation**: add an admin-only, CSRF-protected mutation analogous to `DELETE /admin/users/{id}`. The approved semantic is soft disable plus session revocation, with no hard delete or cascade of producer-owned data. Use a safe not-found response and existing envelopes. This is an API contract addition, not a schema change.
- **New public pages**: add App Router route modules for Contact and Privacy. The project owner supplies and approves both pages' copy. Until the relevant content is supplied and approved, render the clear blocked-content state and no invented details, legal assurances, or policy text. OQ-2 is resolved; the content itself remains a publication gate.
- **Vehicle validations**: frontend hints and field errors mirror `backend/src/vehicles/schemas.py` and the present `validation.ts`; backend remains authoritative. No migration is expected for this feature.
- **Responsive layout**: keep intrinsically tabular data readable with a labeled, contained scroll region where needed. Do not hide records or actions to simulate responsiveness.
- **Accessibility**: use MUI semantics, programmatic labels, keyboard-operable controls, visible focus, live status/error feedback, and non-color cues for dashboard categories. The gauge must expose its percentage and range textually in addition to its needle.

## Implementation Sequence

### Phase 1 — Shared shell, theme, and public landing

1. Introduce shared dark/light preference state and wire root `Providers` to render the selected MUI theme; adapt the admin layout to the same preference without losing its authorization gate.
2. Update shared navigation and account/admin shells for consistent brand, theme control, responsive navigation, and logout presentation. Keep one sign-out control per shell and unchanged auth request behavior.
3. Change the landing CTA to `/login`; make How it works visible/discoverable and keyboard accessible on mobile and desktop.
4. Add Contact/Privacy route shells and footer navigation. The pages remain content-blocked until the project owner supplies and approves their respective copy; no text is invented.

**Requirements**: FR-001–FR-004, FR-024, FR-026–FR-028; US1.  
**Verification**: landing/auth route navigation; theme persistence over reload and public/account/admin navigation; keyboard/focus and narrow viewport checks; assert no unapproved contact/privacy content.

### Phase 2 — Authentication and profile

1. Polish Login/Register fields, validation summaries, inline errors, pending/success states and keyboard focus while preserving current API payloads and validation rules.
2. Remove email-unverified presentation copy in Register/Profile only; keep `email_verified` and every feature 005 backend/account behavior untouched.
3. Render role as non-interactive labeled text; remove profile-level duplicate sign-out and rely on shared navigation.
4. Update successful password-change and self-deactivation client flows to clear authenticated state and navigate to `/`; cancellation/failure must preserve a still-valid session and show safe feedback.

**Requirements**: FR-005–FR-009, FR-024, FR-027–FR-028; US2.  
**Verification**: extend `frontend/tests/auth-registration.spec.ts`, `auth-profile.spec.ts`, `auth-session.spec.ts`, and role-boundary coverage as appropriate; retain backend auth/profile/session tests as contract evidence. Assert failed actions do not clear auth and forbidden role changes remain rejected server-side.

### Phase 3 — Trip planning, favorites, range control and map

1. Add favorites remove API/service/schema behavior with owner isolation, authenticated session, CSRF, safe envelope and tests; update trips API and Redux state for pending/success/failure and retry-safe UI.
2. Show at most two favorites with Show more and implement the approved immediate refill behavior after successful deletion. Never add page-number pagination to favorites.
3. Replace the plain current-level input presentation with an accessible MUI popup/dashboard. Keep the current percentage bounds and `range_km × percentage / 100` value; hide native numeric spinners while retaining keyboard input.
4. Add route-preview Stop with abort/token invalidation and reset UI state. Ensure canceled/stale results cannot replace a later preview and do not claim server cancellation.
5. Improve route details using only existing response fields; expose origin, destination, ordered legs, stops, attraction/restaurant details and incomplete feasibility clearly.
6. Render the map region before route geometry with an informational empty state. Preserve existing Leaflet map geometry, attribution, markers and provider-error behavior after preview.
7. Retain Trip History server pagination and sorting; verify page navigation, sort changes, and global summary. Do not add Trip History filters: the approved source request asks to check pagination, and the existing history UI/API expose sorting and pagination but no filters.

**Requirements**: FR-010–FR-015, FR-020–FR-021, FR-026–FR-028; US3–US4.  
**Verification**: backend `test_trip_favorites.py` (including new delete auth/ownership cases), relevant route/schema tests, `frontend/tests/trip-favorites.spec.ts`, `trip-planning.spec.ts`, `trip-history.spec.ts`; test rapid generate/Stop/generate order, range minimum/maximum, pre-route and loaded-map states.

### Phase 4 — Vehicle garage and form polish

1. Remove the duplicate Add vehicle action only in the empty-garage state; keep the existing primary action in the page header.
2. Align field-level accessible errors and client boundaries to backend vehicle schema and existing validation rules, including non-negative whole-number range/mileage; avoid new arbitrary casing/format constraints.
3. Polish Add/Edit dialog spacing, action hierarchy, pending/error states, focus and small-screen layout.
4. Verify image preview, Commons attribution/license, uploaded-photo priority, persistence, owner-only content and explicit discard remain unchanged.

**Requirements**: FR-021–FR-023, FR-026–FR-028; US5.  
**Verification**: existing `backend/tests/test_vehicle_*` contract/persistence tests and `frontend/tests/vehicles-list.spec.ts`, `vehicles-create-edit.spec.ts`, `vehicles-delete.spec.ts`, and feature 013 image-preview coverage. Include keyboard and narrow viewport checks.

### Phase 5 — Admin dashboard and producer lifecycle

1. Apply existing Drive Wise wordmark treatment to all admin routes and unify theme/logout shell behavior from Phase 1.
2. Style Users/Producers/Vehicles summary cards with distinct accessible accents and textual/icon identification; keep API totals and chart groupings unchanged.
3. Add producer deactivation API and backend tests for admin access, CSRF, target role, soft-disable state, session revocation, no data deletion, safe errors and repeat behavior.
4. Add producer row action and a target-specific confirmation dialog with separate Cancel/Confirm, pending guard, focus handling, safe result announcement and refresh of affected rows/statistics only after success.
5. Audit current admin filters/sorting and admin plus Trip History pagination/sorting; fix usability defects while preserving server-side pagination and accurate global counts. Do not add Trip History filters or pagination to short collections.

**Requirements**: FR-016–FR-020, FR-024, FR-027–FR-028; US6.  
**Verification**: extend `backend/tests/test_admin_dashboard.py` and `frontend/tests/admin-dashboard.spec.ts`; verify anonymous/non-admin denial against API as well as hidden/guarded UI; use multiple admin pages, active admin filters, and sort changes to confirm all matching records remain reachable and totals remain global. For Trip History, verify multiple pages, sort changes, and the global summary; do not test or add history filters.

### Phase 6 — AI Concierge polish and application-wide responsive review

1. Polish chat text hierarchy, control labels, spacing, focus/contrast and narrow-screen layout, preserving overlay behavior, voice consent, transcription review, API contract, and audio Stop semantics.
2. Audit every route under `frontend/src/app` plus shared dialogs, tables, map, auth forms, vehicle forms, trip history and admin lists at supported desktop/mobile viewport sizes.
3. Fix page-level clipping/overlap and control reachability; use contained horizontal scroll only for intrinsically tabular content.
4. Run the relevant existing test suites and configured frontend type check; record results, uncovered areas, and any unavailable checks without marking skipped checks successful.

**Requirements**: FR-021, FR-025–FR-028; US7 and cross-cutting accessibility.  
**Verification**: relevant assistant tests where present, all affected Playwright suites, targeted keyboard checks, responsive viewport review and `npm run type-check`.

## API, Data, and Migration Impact

- **Favorite deletion**: backend trip service/router/schema and OpenAPI gain one owner-scoped delete operation. No persistence change is anticipated because `TripFavorite` already has an owner and stable id. Confirm CSRF and envelope details against neighboring mutation routes.
- **Producer deactivation**: backend admin route/schema and OpenAPI gain a mutation. Existing account `status` and session revocation are sufficient; no migration or deletion of associated product records is planned.
- **Theme**: browser preference only; no backend profile field or account synchronization is specified. Persist locally using the project’s existing local-storage pattern. Unset means dark.
- **Everything else**: presentation/client coordination changes over existing contracts; no data migration expected. Vehicle image, route preview/history, account verification and profile role contracts remain stable.

## Test and Review Strategy

- **Backend**: pytest focused on favorites/auth ownership and admin producer disable/session revocation, plus existing auth/profile/admin/trip/vehicle/schema tests as impacted. Validate API envelope, OpenAPI shapes, CSRF, role checks, safe errors and no cross-owner disclosure.
- **Frontend**: run `npm run type-check`; extend existing Playwright specs rather than adding a second test framework. Cover acceptance flows, keyboard/focus, theme persistence, stale requests, cancellation, safe failures and mobile/desktop viewports.
- **Integration**: run frontend against the test backend for add/remove favorites, producer deactivation, account lifecycle redirects and persisted theme. Confirm stats/rows refresh after mutations and failed actions retain usable state.
- **Scope review**: compare the diff to FR-001–FR-028 and the 25-item traceability table. Confirm no legal/contact text was invented, no role/auth boundary was moved to the client, and no route/autonomy, email-verification, vehicle-photo or AI contract changed.
- **Completion evidence**: record exact commands, actual pass/fail/skip counts and any environment limitations in the feature review/task record. Do not count an unrun test as passing.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Separate admin/root themes diverge or flash the wrong theme | Centralize preference/provider, initialize from dark safely, and test reload/navigation across route groups. Avoid competing copies of shared state. |
| Favorite removal leaks cross-owner data or fails to refill a visible slot | Enforce ownership in the backend, cover anonymous/foreign IDs, and test the approved stable-order refill behavior. |
| Client abort is mistaken for provider-side cancellation | Define Stop copy and state as client cancellation only; invalidate stale responses even when transport abort is unavailable. |
| Producer disable accidentally deletes data or misses sessions | Reuse disable-plus-session-revocation lifecycle; do not cascade-delete owner feature data; test persisted data and old sessions after disable. |
| Broad responsive sweep causes regressions in specialized UI | Test each route group and primary actions at target sizes; keep changes local and use existing MUI breakpoints. |
| Vehicle or auth polish changes existing semantics | Preserve backend validators, feature 005 account lifecycle and feature 013 photo precedence; verify existing focused tests. |
| Unapproved legal/contact copy is published | Keep separate routes/footer links but use pending content until an owner provides approved wording/details. |
| Color-only admin communication or inaccessible gauge | Keep category labels and text; pair gauge needle with numeric percent and estimated kilometers, keyboard operation and visible focus. |

## Resolved Decisions and Remaining Content Gates

1. **OQ-1 — Favorite list after removal: resolved.** After successful deletion from the collapsed list, the next saved favorite in stable list order immediately fills the vacated slot when one exists. Show at most two routes while collapsed; “Show more” reveals the remaining routes. Failed deletion retains the favorite and enables retry.
2. **OQ-2 — Contact/Privacy content: resolved.** The project owner supplies and approves both pages' content. Each page remains blocked until its text/details are supplied and approved; do not invent contact information, legal wording, or privacy claims. Route shells and footer links may remain available while content is blocked.

The Trip History filter mismatch is resolved in scope: the source Note asks for a pagination check; the existing Trip History UI/API provide sorting and pagination, not filters. Preserve and verify history pagination/sorting and summary; do not add filters. Existing admin filters remain in scope where already supported. No additional product behavior is inferred.

## Constitution Alignment

- **I — Modular boundaries**: UI coordination stays in frontend feature modules; favorite/producer ownership and lifecycle stay in FastAPI services/routes.
- **II — Reusable frontend**: retain Next.js, React/TypeScript, Redux Toolkit, MUI and existing component conventions; no dependencies proposed.
- **III — Shared state**: app-wide theme belongs in one Redux preference; transient modal/range state may remain local.
- **IV — Explicit contracts/access**: document favorite-delete and producer-deactivate envelopes and errors; server enforces CSRF, role and ownership. UI visibility is not security.
- **V — Verified accessible outcomes**: every behavior has acceptance tests, including failures, keyboard/focus, responsive layouts and backend access boundaries.
- **VI — Bounded travel assistance**: Concierge changes are presentational and preserve existing travel scope, disclosures and user-controlled voice behavior.
