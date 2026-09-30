# Research: Drive Wise Frontend Setup

**Date**: 2026-09-30
**Sources**: [Feature specification](spec.md), [project constitution](../../.specify/memory/constitution.md), current repository [README](../../README.md), and frontend boundary guide [frontend/README.md](../../frontend/README.md).

## Findings

- The current root README describes the new repository skeleton; it is not the README of the old product implementation. The user has now explicitly approved Next.js 16/App Router, React 19, Node.js 20+ with npm, Redux Toolkit/React Redux, compatible MUI, a committed npm lockfile, and `npx tsc --noEmit`.
- The frontend area already exists as `frontend/` with `src/`, `tests/`, and `README.md`, but contains no package manifest, lockfile, framework/build configuration, type-check command, or dependency set to preserve.
- The constitution mandates React, TypeScript, Redux, and Material UI (MUI). It does not specify their versions, runtime, framework, build tool, package manager, Redux integration packages, type-check tooling, test tooling, or router.
- The earlier legacy product description mentions Next.js, Tailwind CSS, Leaflet, FastAPI, SQLAlchemy, Pydantic, Alembic, JWT, and external services. Next.js is now explicitly approved for this feature; the other legacy items are not approved or needed here.

## Legacy Comparison and Decisions

| Legacy reference | Relationship to constitution and frontend scope | Decision and blocker |
|---|---|---|
| Next.js | The constitution mandates React but does not choose a framework; the user explicitly approved Next.js 16 and App Router. | Resolved as Next.js 16.3.7. Registry metadata reports Node `>=20.9.0` and React/React DOM peer ranges including React 19.3.0. |
| Tailwind CSS | MUI is mandated for standard UI controls. The constitution does not state whether a second styling system is allowed or needed. | Open and not needed for this no-screen setup. Do not add it without explicit approval (FR-002/008). |
| Leaflet | A map library for a product capability excluded by FR-009. | Out of scope; does not block frontend setup. |
| FastAPI | Backend framework, outside this frontend feature; the constitution mandates Python but does not select its framework. | Out of scope here; does not block frontend setup. |
| SQLAlchemy and Alembic | Backend persistence/ORM/migration choices; no data model or persistence exists for this feature. | Out of scope; no database dependency or configuration. |
| Pydantic | Backend schema/input validation choice; no frontend/backend API is introduced. | Out of scope; no schema dependency. |
| JWT | Authentication mechanism; no authentication flow is in scope. | Out of scope; no token or identity integration. |
| External services | No provider or frontend integration is approved or needed for the baseline. | Out of scope; no credentials or service configuration. |

## Approved Setup Decisions

| Package/tool | Exact version or range | Evidence and use |
|---|---|---|
| Node.js | `>=20.9.0` | User approved Node.js 20+; Next.js 16.3.7 declares `>=20.9.0` as its engine minimum. |
| npm | Existing workspace npm; commit `package-lock.json` | User approved npm and a lockfile; use `npm ci` for reproducible installation. |
| Next.js | `16.3.7` | User approved Next.js 16/App Router; this is the latest 16.x release returned by the registry during planning. |
| React / React DOM | `19.3.0` | User approved React 19; Next.js 16.3.7 peer ranges include React and React DOM `^19.0.0`. |
| TypeScript | `5.9.3` | Latest 5.x release verified from npm; use the approved `npx tsc --noEmit` check. |
| Redux Toolkit / React Redux | `2.13.0` / `9.3.0` | User approved these integrations; registry peer metadata supports React 19 and Redux 5 compatibility. |
| MUI Material / Next adapter | `9.4.0` / `9.4.0` | User approved compatible MUI; registry metadata includes React 19, Next 16, and exports `@mui/material-nextjs/v16-appRouter`. |
| Emotion integration peers | `@emotion/cache@11.14.0`, `@emotion/react@11.14.0`, `@emotion/server@11.11.0`, `@emotion/styled@11.14.1` | Required by the MUI App Router adapter and standard MUI styling integration; versions satisfy the published peer ranges. Pigment CSS is not needed. |
| Type declarations | `@types/node@20.19.43`, `@types/react@19.3.0`, `@types/react-dom@19.3.0` | Match the selected Node 20 and React 19 baselines. |

Direct dependencies are pinned in `package.json`; npm resolves and records transitive dependencies in `package-lock.json`. No test runner, lint, formatter, additional router, Tailwind, or product/service dependency is selected.

## Remaining Non-blocking Decisions

| Decision | Current evidence | Blocks |
|---|---|---|
| Automated test, lint, and formatting tools | Not selected and not required for this setup-only feature. | Non-blocking; do not add tools by assumption. |

## Rationale and Alternatives

Use the existing `frontend/` boundary and the user-approved Next.js/React/Redux/MUI baseline. The current root README is the skeleton guide, not the old application README; only Next.js from the earlier legacy list has been explicitly approved. Tailwind CSS and all old product, backend, persistence, authentication, map, and service choices remain excluded. The npm peer metadata confirms the pinned baseline is compatible.
