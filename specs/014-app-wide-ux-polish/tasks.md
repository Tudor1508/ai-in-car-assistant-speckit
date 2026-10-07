# Tasks: App-wide UX Polish

**Inputs**: [`spec.md`](spec.md), [`plan.md`](plan.md), [`checklists/requirements.md`](checklists/requirements.md)
**Scope**: implementation and verification of unlocked tasks; Contact/Privacy copy and vehicle-photo-dependent checks remain blocked.
**Task notation**: `[P]` means the task may be done in parallel with other ready `[P]` tasks in its zone because it has no shared-file/dependency conflict. Every task is unchecked until implemented and verified with evidence.

## Rules and Dependencies

- Work through the six zones in order, while tasks marked `[P]` inside a zone can proceed concurrently when dependencies are met.
- Link every implementation and verification task to functional requirements (FR), acceptance criteria (US scenario), and success criteria (SC) where applicable.
- Backend authorization, CSRF, validation and ownership are authoritative. A frontend control is never the security boundary.
- Do not change auth/email-verification/session semantics, route selection or autonomy, vehicle-image ownership/precedence, pagination contracts, or AI Concierge/audio behavior outside the explicit UX requirements.
- Favorite deletion must refill the collapsed list from the next saved route, keeping at most two visible; “Show more” exposes the rest.
- Contact/Privacy routes may show the specification-approved blocked-content state. Do not draft, infer, or publish their contact/legal text. The content-insertion tasks remain blocked until the project owner supplies and approves both texts.

## Zone 1 — Shared shell and landing page

### Theme, shells, and shared navigation

- [x] **T001** Add focused frontend coverage for the shared light/dark preference: dark default, toggle, route navigation, and persistence after reload across public, auth, account, vehicle, trip, Concierge, and admin routes. (FR-003, FR-028; AC: US1.3; SC-003, SC-009)
- [x] **T002** Add one shared Redux-owned theme preference with hydration-safe dark default and existing local persistence; keep transient UI state local and avoid a second competing admin theme state. (FR-003, FR-026, FR-028; AC: US1.3; SC-003)
- [x] **T003** Wire root MUI `Providers` and the admin shell to the shared theme while preserving admin authorization checks and the saved preference behavior. (FR-003, FR-016, FR-026–FR-028; AC: US1.3, US6.1; SC-003, SC-007)
- [x] **T004** Apply the existing Drive Wise brand treatment and consistent shared logout presentation to public/account/admin shells; retain exactly one sign-out action per shell and existing logout request semantics. (FR-016, FR-024, FR-027–FR-028; AC: US2.4, US2.7, US6.1; SC-007, SC-009)
- [x] **T005** Make shared navigation and theme controls keyboard-operable and usable at supported narrow widths, with accessible names, visible focus, and no clipped primary actions. (FR-003, FR-021, FR-024, FR-028; AC: US1.3, US7.2–US7.3; SC-003, SC-009)

### Landing, footer, and public content routes

- [x] **T006 [P]** Update the landing-page “Start your journey” action to `/login`; make “How it works” visibly interactive at narrow and wide widths with keyboard operation and visible focus. (FR-001, FR-004, FR-021, FR-028; AC: US1.1, US1.4; SC-002, SC-009)
- [x] **T007** Add `/contact` and `/privacy` route shells and footer links. Until owner-approved content is available, show the specification-approved blocked-content status; include no placeholder contact details, legal wording, privacy claims, or inferred content. (FR-002, FR-021, FR-028; AC: US1.2; SC-002, SC-009)
- [ ] **T008 [BLOCKED: owner content]** Insert the project owner’s approved Contact text/details into `/contact` after they are supplied. Keep this task unchecked and the page content blocked until owner approval is recorded; do not author or infer the text. (FR-002; AC: US1.2; SC-002)
- [ ] **T009 [BLOCKED: owner content]** Insert the project owner’s approved Privacy text into `/privacy` after it is supplied. Keep this task unchecked and the page content blocked until owner approval is recorded; do not author or infer legal claims. (FR-002; AC: US1.2; SC-002)
- [x] **T010** Add frontend tests for landing login navigation, keyboard/focus behavior of “How it works,” footer destinations, and the blocked state with no unapproved Contact/Privacy content. (FR-001–FR-004, FR-028; AC: US1.1–US1.4; SC-002, SC-009)

## Zone 2 — Authentication and profile

- [x] **T011 [P]** Add/update auth UI tests for login and registration validation, field errors, pending states, success/failure feedback, keyboard access, and visible focus without changing API payloads or authentication rules. (FR-005, FR-028; AC: US2.1; SC-007, SC-009)
- [x] **T012 [P]** Add/update profile tests for removal of “email not verified” presentation copy and display of role as non-editable, non-focusable information; retain backend verification state and self-service role rejection. (FR-006–FR-007, FR-027–FR-028; AC: US2.2–US2.3; SC-007)
- [x] **T013** Remove only the email-unverified helper/alert from Register and Profile and replace the role input with labeled static information. Preserve all feature 005 response fields, verification state, access behavior, and profile update allowlists. (FR-006–FR-007, FR-027–FR-028; AC: US2.2–US2.3; SC-007)
- [x] **T014** Remove the duplicate profile-level sign-out action and verify shared navigation remains the single sign-out location on the profile page. (FR-008, FR-024, FR-028; AC: US2.4, US2.7; SC-007)
- [x] **T015** Update successful password change and self-deactivation client flows to clear auth state and navigate to `/`; preserve valid auth state and show safe feedback after cancellation or failure. Do not alter feature 005 server-side revocation or account-disable behavior. (FR-009, FR-027–FR-028; AC: US2.5–US2.6; SC-007, SC-010)
- [x] **T016** Add/update session/profile integration tests for successful and failed password change/deactivation navigation, cancellation, auth clearing, and server-side role/session behavior. (FR-006–FR-009, FR-027; AC: US2.2–US2.6; SC-007, SC-010)

## Zone 3 — Trip planning and map

### Favorites API and list

- [x] **T017 [P]** Add backend tests for favorite deletion: authenticated owner succeeds; anonymous access is denied; a different account cannot delete or infer another owner’s favorite; CSRF, safe envelopes, and failure behavior match existing conventions. (FR-011, FR-027; AC: US3.2; SC-004, SC-007)
- [x] **T018** Add an owner-scoped favorite delete operation to the existing trip service/router using established account, CSRF, error-envelope, and not-found conventions. Do not change favorite persistence or other accounts’ data. (FR-011, FR-027; AC: US3.2; SC-004, SC-007)
- [x] **T019 [P]** Add typed frontend API and Redux status/actions for removing a favorite, including pending/success/failure handling and retaining the item after failure. (FR-011, FR-026, FR-028; AC: US3.2; SC-004)
- [x] **T020** Update `FavoriteRoutes` to show at most two saved routes when collapsed, reveal remaining routes through “Show more,” provide an accessible remove action, and immediately fill a deleted visible slot with the next saved route in stable list order. On failure keep the route visible and retryable. Do not add page-number pagination. (FR-010–FR-011, FR-020, FR-028; AC: US3.1–US3.2; SC-004, SC-008)
- [x] **T021** Add frontend tests for empty, one, two, and more-than-two favorites; Show more; automatic refill after deletion; deleting the last entries; owner-safe errors; and retry after failure. (FR-010–FR-011, FR-020, FR-027–FR-028; AC: US3.1–US3.2; SC-004, SC-007–SC-008)

### Current-level control, preview cancellation, details, and map

- [x] **T022 [P]** Add component/API tests for route-preview cancellation and request ordering: Stop appears only while pending, stale/canceled results never replace a later preview, and controls recover after cancellation. Assert UI claims client cancellation only. (FR-013, FR-028; AC: US3.5; SC-006)
- [x] **T023** Implement Stop for route preview using `AbortSignal` if the existing API client supports it, otherwise a request-generation token. Restore planner controls and ignore late results; do not claim backend/provider cancellation or affect saved trips, favorites, or Concierge audio. (FR-013, FR-026, FR-028; AC: US3.5, US7.1; SC-006, SC-010)
- [x] **T024 [P]** Add range-control tests for minimum/maximum valid percentage, keyboard operation, accessible popup/needle description, numeric spinner absence, and matching displayed kilometers. (FR-012, FR-028; AC: US3.3–US3.4; SC-005, SC-009)
- [x] **T025** Implement the accessible current fuel/battery dashboard popup with a visual needle and textual percentage/range; hide native numeric spinner arrows while preserving bounds, keyboard entry, the current `range_km × percentage / 100` calculation, and API meaning. (FR-012, FR-026, FR-028; AC: US3.3–US3.4; SC-005)
- [x] **T026 [P]** Add/update route-summary tests asserting origin, destination, ordered legs, stops, per-leg distances, and incomplete feasibility use only current API response data. (FR-014, FR-026, FR-028; AC: US3.6; SC-010)
- [x] **T027** Improve route-detail hierarchy for origin, destination, ordered legs, recommended stops, per-leg distances, and incomplete/unreachable state using current response data only. Keep route choice, recommendation, and autonomy behavior unchanged. (FR-014, FR-026, FR-028; AC: US3.6; SC-010)
- [x] **T028 [P]** Add tests for the map area before locations/geometry exist, successful preview rendering, and non-blocking tile/provider failure while preserving attribution. (FR-015, FR-028; AC: US4.1–US4.4; SC-009–SC-010)
- [x] **T029** Render the existing map region before a route exists with an informational empty state and non-blocking provider error; do not fabricate endpoints, route, stops, or location, and do not add click-to-select behavior. Preserve existing route geometry and attribution. (FR-015, FR-026, FR-028; AC: US4.1–US4.4; SC-009–SC-010)
- [x] **T030** Verify Trip History sorting, server page navigation, and global summary remain correct and reachable on supported viewports; preserve existing pagination and API contracts. Do not add Trip History filters because the approved source request asks to check pagination and the current history UI/API expose sorting and pagination only. (FR-020–FR-021, FR-028; AC: US6.5, US7.2–US7.3; SC-008–SC-009)

## Zone 4 — Vehicles

- [x] **T031 [P]** Add/update garage/form tests for a single primary Add action when empty, existing Add/Edit behavior when populated, field-specific invalid input feedback, and responsive dialog operation. (FR-021–FR-023, FR-028; AC: US5.1–US5.3, US5.5; SC-009–SC-010)
- [x] **T032** Remove the duplicate empty-state Add vehicle action while retaining the page’s primary header action. (FR-022, FR-028; AC: US5.1; SC-009–SC-010)
- [x] **T033** Align vehicle field errors and validation display with current backend schemas and frontend validators, including required name/model, supported year and non-negative whole-number range/mileage. Do not impose uppercase-only or other unapproved rules; backend remains authoritative. (FR-023, FR-027–FR-028; AC: US5.2–US5.3; SC-007, SC-010)
- [ ] **T034 [P]** Add responsive and accessibility checks for Add/Edit Vehicle dialog, errors, focus behavior, and image controls at supported narrow and wide viewports. (FR-021, FR-023, FR-028; AC: US5.4–US5.5, US7.2–US7.3; SC-009–SC-010)
- [ ] **T035** Polish Add/Edit Vehicle MUI dialog hierarchy, spacing, pending/error feedback, focus handling, and narrow layout while preserving the existing feature 013 preview, license attribution, private upload, photo precedence, persistence, and discard behavior. (FR-021, FR-023, FR-026–FR-028; AC: US5.4–US5.5; SC-009–SC-010)

## Zone 5 — Admin dashboard

- [x] **T036 [P]** Add backend tests for producer deactivation: admin allowed; anonymous/non-admin denied; CSRF required; producer disabled and active sessions revoked; associated records retained; safe not-found/failure and repeat behavior. (FR-018–FR-019, FR-027; AC: US6.3–US6.4, US6.6; SC-007)
- [x] **T037** Add an admin-only, CSRF-protected producer deactivation endpoint following the approved soft-disable/session-revocation lifecycle used by user deactivation. Preserve producer-owned data and expose no hard-delete or cascade behavior. (FR-018–FR-019, FR-027; AC: US6.3–US6.4, US6.6; SC-007)
- [x] **T038 [P]** Add frontend tests for admin wordmark, non-color-only statistics, producer confirmation cancellation/success/failure/pending states, role denial, and list/stat refresh after success. (FR-016–FR-019, FR-027–FR-028; AC: US6.1–US6.4, US6.6; SC-007, SC-009)
- [x] **T039** Add typed producer-deactivation API and admin state handling, then expose the action for producer rows with target-specific confirmation, distinct Cancel/Confirm actions, duplicate-submit guard, focus support, safe feedback, and refresh only after success. Keep existing user deactivation behavior intact. (FR-018–FR-019, FR-027–FR-028; AC: US6.3–US6.4, US6.6; SC-007, SC-009)
- [x] **T040** Apply existing Drive Wise wordmark treatment to every admin route and style Users/Producers/Vehicles statistic cards with distinct accessible accents plus text/icon cues, retaining server totals and chart grouping. (FR-016–FR-017, FR-028; AC: US6.1–US6.2; SC-007, SC-009)
- [x] **T041** Improve destructive confirmations for existing user deactivation and other current destructive actions to identify the target/consequence, separate cancellation from confirmation, announce safe outcome, support keyboard/focus, and prevent duplicate pending submission without changing lifecycle semantics. (FR-019, FR-027–FR-028; AC: US6.4; SC-007, SC-009)
- [x] **T042** Audit admin server-side pagination, filters, sorting, and global statistics with multi-page test data; fix usability defects without adding unnecessary pagination or changing API contracts. (FR-017, FR-020–FR-021, FR-027–FR-028; AC: US6.2, US6.5–US6.6; SC-007–SC-009)

## Zone 6 — AI Concierge and application-wide responsive review

- [x] **T043 [P]** Add/update Concierge tests for responsive chat layout, accessible labels/focus/contrast, and preserved send, microphone, consent, transcription, playback, Stop, and close behavior. (FR-021, FR-025, FR-028; AC: US7.1–US7.3; SC-009–SC-010)
- [x] **T044** Polish `TravelConcierge` typography, spacing, control labels and small-screen behavior without changing feature 011 scope, overlay behavior, provider disclosure, voice consent, audio Stop behavior, or API contract. (FR-025–FR-026, FR-028; AC: US7.1; SC-009–SC-010)
- [x] **T045 [P]** Add and run a responsive route/keyboard audit for every App Router page at 375, 768, and 1440 px. Verify page overflow, keyboard reachability and accessible names of visible controls, plus the Concierge panel and admin producer dialogs. Vehicle Add/Edit image controls remain covered by the separate T034/T035 gate. (FR-021, FR-028; AC: US7.2–US7.3; SC-009)
- [x] **T046** Fix verified page-level clipping, overlap, unreachable primary actions, and keyboard/focus issues across existing routes. Keep wide tabular overflow contained and accessible; do not hide data or introduce product behavior. (FR-021, FR-026, FR-028; AC: US7.2–US7.3; SC-009)
- [x] **T047** Run the configured frontend type check and affected Playwright suites across public, auth/profile, trip, vehicle, admin, and Concierge flows; record exact pass/fail/skip counts and environment limitations. (FR-001–FR-028, SC-001–SC-010)
- [x] **T048** Run focused backend tests for favorite ownership/delete, producer deactivation/session revocation, auth/profile lifecycle, existing trip/vehicle contracts, API conventions and OpenAPI; record exact outcomes and verify unauthorized operations remain denied. (FR-005–FR-027, SC-004, SC-007–SC-008, SC-010)
- [ ] **T049** Review the final diff against the spec and constitution after T050 and the approved-content/photo gates are complete: all 25 Note items and FR-001-FR-028 traced to evidence; owner Contact/Privacy text supplied and approved before unblocking T008/T009; no invented content, no changed auth/role/ownership behavior, no routing/autonomy changes, no feature 013 photo regression, and no AI scope change. (FR-001-FR-028, SC-001-SC-010; constitution I-VI)
- [x] **T050** Reconcile `plan.md`, `spec.md` SC-008, and T030 with resolved OQ-1/OQ-2 and the source Note. Record the approved stable-order favorite refill and owner-supplied Contact/Privacy content gate. Resolve the Trip History filter mismatch by preserving its existing sorting/pagination and global summary without adding filters; keep existing admin filters in scope. Do not change product code. (FR-002, FR-010-FR-011, FR-020; AC: US1.2, US3.1-US3.2, US6.5; SC-004, SC-008)

## Traceability Index

| Requirements | Tasks |
|---|---|
| FR-001-FR-004 | T001-T003, T006-T010, T050 |
| FR-005–FR-009 | T011–T016 |
| FR-010-FR-011 | T017-T021, T050 |
| FR-012–FR-015 | T022–T029 |
| FR-016-FR-020 | T003-T005, T030, T036-T042, T050 |
| FR-021–FR-024 | T004–T006, T030–T035, T040–T046 |
| FR-025–FR-028 | T001–T005, T010–T016, T019, T021–T030, T031–T049 |
| SC-001-SC-010 | T006-T010, T017-T050 as listed with each task acceptance reference |

## External Blockers

- **Contact copy (T008)**: the project owner must supply and approve contact details/text before this task is unblocked.
- **Privacy copy (T009)**: the project owner must supply and approve legal/privacy text before this task is unblocked.
- **Vehicle photos (T034/T035)**: the current implementation has no feature 013 uploaded-photo/image controls. Responsive checks and preservation of image attribution, private-upload precedence, persistence, and discard behavior cannot be verified here; keep these tasks unchecked until that implementation is available.
- Until both owner texts are approved, Contact/Privacy content must remain blocked in the UI. T049 also remains unchecked because its acceptance requires T050, approved content, and a photo-regression review.

## Verification Record

- T030/T050: `plan.md`, SC-008, and T030 now match the approved scope. Trip History sorting, pagination, and the global summary were verified; no history filters were added.
- T045: added `frontend/tests/app-wide-responsive-audit.spec.ts`. Its 39 cases cover all 13 App Router routes at 375/768/1440 px, page-level horizontal overflow, named visible controls reached by Tab, the Concierge overlay, and both producer dialogs. Add/Edit Vehicle image controls remain outside this audit while T034/T035 await feature 013.

- Frontend type check: `npm run type-check` - passed (`tsc --noEmit`).
- T030/T045 Playwright command:
  ```powershell
  npm run test:e2e -- tests/trip-history.spec.ts tests/app-wide-responsive-audit.spec.ts --timeout=60000 --workers=1 --reporter=line
  ```
  Result: 43 passed, 0 failed, 0 skipped. This includes all 39 route/viewport cases and all four Trip History tests. The audit checked no page-level horizontal overflow and keyboard reachability of labeled visible controls at 375, 768, and 1440 px. At each size, Trip History kept the 5,940 km global summary visible while moving from page 1 to page 2; the Concierge panel and Add Producer/deactivation dialogs were also opened and keyboard-audited. Vehicle Add/Edit image controls remain gated separately under T034/T035 until feature 013 is present on this branch.
- Playwright command:
  ```powershell
  npm run test:e2e -- tests/app-wide-shell.spec.ts tests/auth-registration.spec.ts tests/auth-profile.spec.ts tests/account-navigation.spec.ts tests/trip-favorites-ux.spec.ts tests/trip-ux.spec.ts tests/trip-history.spec.ts tests/vehicles-ux.spec.ts tests/vehicles-delete.spec.ts tests/admin-ux.spec.ts tests/concierge.spec.ts --grep-invert "asynchronously loaded local voices|backend TTS fake|neither a local voice nor backend TTS" --timeout=30000 --workers=1
  ```
  Result: 36 passed, 0 failed, 0 skipped. Three legacy Concierge audio cases were filtered out; their asynchronous local-voice/backend-TTS behavior is outside feature 014 and is not implemented by the current feature 011 code.
- Favorite-list targeted run: `npm run test:e2e -- tests/trip-favorites-ux.spec.ts --timeout=30000 --workers=1 --reporter=line` - 3 passed. Covers empty, one, exactly two, and more than two favorites, refill, failure/retry, and removal of the last favorite. This targeted run was repeated in the final combined suite above.
- Focused backend command (20 suites):
  ```powershell
  .venv\Scripts\python.exe -m pytest tests/test_trip_favorites.py tests/test_admin_producer_deactivation.py tests/test_admin_dashboard.py tests/test_auth_access_matrix.py tests/test_auth_login_logout.py tests/test_auth_persistence.py tests/test_auth_profile.py tests/test_auth_registration.py tests/test_auth_session_security.py tests/test_trip_attractions.py tests/test_trip_history.py tests/test_trip_places.py tests/test_trip_preview.py tests/test_trip_schemas.py tests/test_vehicle_delete.py tests/test_vehicle_list.py tests/test_vehicle_mutations.py tests/test_vehicle_persistence.py tests/test_vehicle_read_authorization.py tests/test_api_conventions.py -q -k "not test_live_route_preview_includes_range_reachable_stops and not test_live_route_preview_reports_no_feasible_station_chain" --basetemp=pytest-tmp-014-final-ux-stable-20261008
  ```
  Result: 135 passed, 3 deselected, 1 existing Starlette deprecation warning. The deselected cases require live ORS routing data. The unfiltered run had 135 passed and 3 live-provider failures in route geometry/stop expectations. No routing/autonomy code was changed.
- Trip-planning legacy suite: an additional broad run was interrupted after live-provider/stale-control failures and produced no reliable aggregate count. It is not represented as a pass. The deterministic 014 trip UX tests above passed.
- Scope note: T047/T048 checkmarks mean the requested verification and reporting were completed. They do not imply that external live-provider scenarios passed.
