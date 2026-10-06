# Implementation Tasks: Public Landing Page

Tasks reflect the implemented repository state. Automated browser verification is not recorded as complete.

## Landing Page

- [x] Render the public landing page at `/` through `frontend/src/app/page.tsx`.
- [x] Add the responsive English hero, login and registration links, sample route illustration, feature cards, and footer in `frontend/src/features/landing/LandingPage.tsx`.
- [x] Use the existing MUI theme and turquoise primary accent; set the document language to English.
- [x] Keep the route preview clearly labeled as sample content.

## Sign-out

- [x] Route successful sign-out from ordinary application navigation and profile controls to `/` after clearing auth state.
- [x] Route successful administrator sign-out to `/` after clearing auth and CSRF state.
- [x] Preserve signed-in state and show safe feedback when sign-out fails.

## Verification

- [x] Frontend type-check and production build passed after implementation, as recorded during implementation work.
- [ ] Verify landing navigation, responsive layout, and both sign-out paths in browser tests.
