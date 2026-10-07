# Feature Specification: Public Landing Page

**Feature Branch**: `009-public-landing-page`  
**Status**: Implemented; automated browser verification not recorded here  
**Input**: Implemented public landing page and sign-out destination requested during the admin dashboard refinement.

## User Scenarios & Testing

### User Story 1 - Discover the application before signing in (Priority: P1)

As a visitor, I want to see what Drivewise does before being asked to sign in so that I can decide whether to register or log in.

**Acceptance Scenarios**

1. Given a visitor opens `/`, when the page loads, then the public English landing page appears rather than the login page.
2. Given a visitor wants to continue, when they select Log in or Get started, then they reach the existing `/login` or `/register` page.
3. Given the landing page describes a route, when its preview is displayed, then it is labeled as a sample illustration and is not presented as live user route data.
4. Given a visitor uses a supported viewport, when the page is displayed, then its content adapts using the existing MUI responsive layout.

### User Story 2 - Return to the public landing page after sign-out (Priority: P1)

As a signed-in user or administrator, I want sign-out to return me to the public landing page.

**Acceptance Scenarios**

1. Given an ordinary signed-in account, when sign-out succeeds, then auth state is cleared and the browser navigates to `/`.
2. Given the administrator signs out successfully, when auth state is cleared, then the browser navigates to `/`.
3. Given sign-out cannot be confirmed, when the request fails, then the user remains signed in and receives the existing safe error message.

## Functional Requirements

- **FR-001**: `/` MUST render the public landing page, not redirect directly to sign-in.
- **FR-002**: The landing page MUST provide links to the existing login and registration routes.
- **FR-003**: The landing page MUST use English interface text and the implemented turquoise primary accent.
- **FR-004**: Route-preview content MUST be identified as sample content; no claim is made that it represents live route data.
- **FR-005**: After successful sign-out from the ordinary application or admin area, the app MUST clear client auth state and navigate to `/`.
- **FR-006**: If sign-out fails, the app MUST retain the current signed-in state and show a clear safe error.

## Success Criteria

- **SC-001**: A fresh visit to `/` displays the landing page and its login and registration links.
- **SC-002**: Successful sign-out through either the ordinary or admin navigation ends at `/`.
- **SC-003**: The route illustration is visibly labeled as a sample and the page uses English text.

## Implemented Content

The page includes a hero, links to sign-in and registration, a sample Cluj-Napoca-to-Bucharest route illustration, three feature cards, and a footer. The route preview is static presentation content. The page design was informed by `docs/reference-ui/dashboard.png`.

## Out of Scope

The feature does not implement route planning, map data, authentication, registration, or a theme switch for the public landing page; those remain in their existing application features.
