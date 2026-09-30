# Frontend Setup Validation Guide

## Prerequisites

- Node.js 20.9.0 or newer
- npm

The frontend is pinned to Next.js 16.3.7 with App Router, React/React DOM 19.3.0, TypeScript 5.9.3, Redux Toolkit 2.13.0, React Redux 9.3.0, and MUI 9.4.0. The committed `frontend/package-lock.json` is authoritative for transitive dependency versions.

## Install and Run

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Confirm that Next.js reports `Ready` and serves `http://localhost:3000`.

## Type Check and Build

From `frontend/`:

```sh
npx tsc --noEmit
npm run build
npm run start
```

Run `npm run start` after a successful production build. The development and production servers use port 3000 by default; choose an unused port using the Next.js CLI option if another local process already uses it.

## Redux and MUI Checks

- Confirm the App Router root wraps children with the MUI `AppRouterCacheProvider` from the `v16-appRouter` entry and the shared frontend providers.
- Confirm the application provider creates one Redux Toolkit store and exposes it through React Redux; no product reducer or competing shared state is introduced.
- Confirm MUI's default theme is available through the root `ThemeProvider` without product controls or screens.
- Confirm the generated route tree contains only the empty root and Next.js not-found route.

## Scope Check

The frontend tree must not contain product screens, product state, product routing, API clients, persistence, authentication, maps, or external-service configuration. No test runner, lint, or formatter is required or selected for this feature.

## Acceptance Mapping

- **SC-001**: Follow Install and Run from a clean checkout within five minutes.
- **SC-002**: `npx tsc --noEmit` exits successfully with zero setup errors.
- **SC-003**: The Redux check confirms one owner for shared state.
- **SC-004**: Build validation and the MUI check succeed without a product screen.
- **SC-005**: Scope Check confirms no product behavior or unapproved dependency.
