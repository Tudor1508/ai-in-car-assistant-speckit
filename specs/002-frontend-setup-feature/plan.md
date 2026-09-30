# Implementation Plan: Drive Wise Frontend Setup

**Branch**: `002-frontend-setup-feature` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-frontend-setup-feature/spec.md`

## Summary

Establish the initial frontend project inside the existing `frontend/` boundary using Next.js 16.3.7 App Router, React 19.3.0, TypeScript 5.9.3, Redux Toolkit 2.13.0 with React Redux 9.3.0, and Material UI 9.4.0. Pin direct dependencies in `package-lock.json`, document npm setup/start/type-check commands, and keep the application root free of product UI and behavior.

## Technical Context

**Language/Version**: Node.js >=20.9.0 (the Next.js 16.3.7 engine minimum), React/React DOM 19.3.0, TypeScript 5.9.3, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, and `@types/node` 20.19.43.

**Primary Dependencies**: Next.js 16.3.7 with App Router; React and React DOM 19.3.0; Redux Toolkit 2.13.0 and React Redux 9.3.0; MUI Material and `@mui/material-nextjs` 9.4.0 using the `v16-appRouter` integration; Emotion cache/react/server/styled packages required by MUI. Use npm with a committed lockfile. No product dependency is included.

**Storage**: None. No product data or persistence is introduced.

**Testing**: Verify clean-checkout install/start and run `npx tsc --noEmit`. A separate test runner, linting, and formatting tools remain unselected and are not required by this setup-only feature.

**Target Platform**: Node.js >=20.9.0 and npm in a contributor development environment; local browser access to the Next.js App Router application.

**Project Type**: Frontend of the existing web application, rooted at `frontend/`.

**Performance Goals**: No product performance target applies to this setup-only feature.

**Constraints**: Preserve the `frontend/` ownership boundary from `001-app-skeleton`. Use the approved versions and npm lockfile. Do not add product UI, product journeys, backend/API calls, persistence, authentication, mapping, or external services. A minimal App Router root page exists only to make the application bootable and returns no product UI.

**Scale/Scope**: One minimal frontend bootstrap, one Redux shared-state root, MUI availability at that root, and contributor instructions for install/start/type-check. No feature screens.

## Approved Decisions and Remaining Scope

| Decision | Status and evidence | Blocks |
|---|---|---|
| Framework and routing convention | Approved: Next.js 16.3.7 App Router. Registry confirms `@mui/material-nextjs@9.4.0/v16-appRouter` is exported. The root route is an empty bootstrap only. | Resolved; no product routes are added. |
| Runtime, framework and UI versions | Approved/pinned: Node.js >=20.9.0, React/React DOM 19.3.0, TypeScript 5.9.3, Next.js 16.3.7, MUI 9.4.0. Peer metadata confirms React 19 support. | Resolved. |
| Package manager and lockfile | Approved: npm; commit generated `frontend/package-lock.json` and install with `npm ci`. | Resolved. |
| Redux integration | Approved: Redux Toolkit 2.13.0 and React Redux 9.3.0. Use one store at the root with no product slices. | Resolved. |
| MUI App Router integration | Approved: MUI 9.4.0 and the matching Next.js adapter 9.4.0 with Emotion peers, using its `v16-appRouter` cache provider. | Resolved. |
| Type checking | Approved exact command: `npx tsc --noEmit`, using local TypeScript 5.9.3. | Resolved. |
| Automated tests, lint, formatting | No tools approved or required for this setup. The acceptance checks are npm install/start, type-check, and root integration inspection. | Non-blocking; do not add a runner. |

**Decision gate**: T001 and T005 are covered by the user's explicit approvals and the compatibility checks recorded in `research.md`. No remaining open choice blocks the approved setup scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Frontend work stays under `frontend/`; it owns presentation and client coordination only. No backend business rule or protected data operation is added. | PASS |
| II. Compatible, Reusable Frontend | Use the approved React/TypeScript versions, Redux Toolkit/React Redux, and MUI. Run the approved type-check command without suppressing errors. | PASS |
| III. One Authority for Shared Client State | The bootstrap has one Redux store/provider for shared state; no competing shared copy or product-domain slice is introduced. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | No API or protected operation is introduced; no frontend/backend contract or authorization design is needed in this feature. | PASS |
| V. Verified, Accessible User Outcomes | Verify local start and type checking from a clean checkout. No user-facing screen is added, so accessibility review of controls is not applicable here. | PASS |
| SDD Development and Review | This plan traces to the feature spec and records unresolved implementation choices as gates; implementation tasks and code review follow in later phases. | PASS |

**Gate status**: PASS. The toolchain and integration decisions are approved and recorded; no constitution exception is proposed.

## Project Structure

### Documentation (this feature)

```text
specs/002-frontend-setup-feature/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # Created in the later $speckit-tasks phase
```

### Source Code (repository root)
```text
frontend/
├── README.md            # Contributor prerequisites and approved commands
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
	├── app/             # Next.js 16 App Router root, provider setup, empty page
	└── lib/             # Redux store
```

**Structure Decision**: Keep all files under the existing `frontend/` ownership boundary. Use Next.js 16 App Router under `frontend/src/app/`, a single Redux store under `frontend/src/lib/`, npm manifests/lockfile, and `tsconfig.json`. The root and frontend contributor READMEs are updated with exact commands. No test runner, product route, or product screen is introduced. The root README and backend area are not changed by this feature.

**Implementation and validation sequence**:

1. Install and lock the approved framework, UI/state packages, type declarations, and required Emotion peers with npm.
2. Create the minimal Next App Router root, Redux store/provider, and MUI App Router cache integration; keep the root page empty.
3. Document `npm ci`, `npm run dev`, `npm run build`, `npm run start`, and `npx tsc --noEmit` in `frontend/README.md`.
4. Validate installation with `npm ci`, type checking, production build, and local server readiness. Verify Redux/MUI root integration and absence of product UI.

## Acceptance Criteria Traceability

| Specification criterion | Planned evidence |
|---|---|
| FR-001 | All frontend-specific files remain under `frontend/`; verify the tree contains no competing frontend root. |
| FR-002 | Dependency declarations use React, TypeScript, Redux, and MUI at plan-approved versions only. |
| FR-003, SC-001 | `frontend/README.md` has approved prerequisites, exact start command, and ready signal; verify on a clean checkout within the stated five-minute setup target. |
| FR-004 | The same guide documents dependency preparation and type-check commands; execute both from a clean checkout. |
| FR-005, SC-003 | One Redux store/provider owns shared client state; inspect bootstrap for duplicate shared state or product slices. |
| FR-006, SC-004 | MUI is integrated at the minimal application root; approved validation succeeds without a product screen. |
| FR-007, SC-002 | The documented type-check command succeeds with no suppressed setup errors. |
| FR-008 | Research and this plan retain explicit open/blocked decisions; inspect dependency/config files for unapproved tooling. |
| FR-009, SC-005 | Review the resulting frontend tree for product screens, routing, backend APIs, data persistence, authentication, and external-service setup; none should be added. |

**Interface contracts**: No `contracts/` artifact is produced for this feature. It defines no browser-to-backend API or external interface; the existing cross-boundary contract rule remains documented by `001-app-skeleton`.

## Complexity Tracking

No constitution violations or exceptions are proposed.
