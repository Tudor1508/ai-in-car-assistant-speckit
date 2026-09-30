# Drive Wise

This repository currently establishes the technical skeleton and contributor boundaries for Drive Wise. Product functionality is not implemented by this work.

## Repository Structure

```text
frontend/
├── README.md
├── src/
└── tests/

backend/
├── README.md
├── src/
└── tests/

specs/001-app-skeleton/
└── contracts/README.md
```

`frontend/` is the home for presentation, user interaction, and client-side coordination. `backend/` is the home for authoritative business rules, protected data operations, and authorization. See [frontend guidance](frontend/README.md) and [backend guidance](backend/README.md) for the detailed ownership boundary and established stack.

## Frontend and Backend Boundary

The frontend baseline is React, TypeScript, Redux, and Material UI (MUI); the backend language is Python. Redux is the single owner of shared client state. The backend remains authoritative for business rules and protected operations. Any future frontend/backend operation must use an explicit API contract that defines request, response, and error shapes. This skeleton defines no endpoints, API protocol, authentication flow, database, or service integration.

## Local Development

Exact prerequisites and startup commands are pending explicit approval of the minimum frontend execution/tooling choices and Python backend execution approach. Do not infer a framework, package manager, or service from the legacy application description. Startup steps will be documented here and in the area guides after those choices are approved; the required check is a clean-checkout start of both areas using only the documented prerequisites.

## Scope

This skeleton does not implement trip planning, vehicle management, route or stop recommendations, maps, saved routes or history, AI Concierge, profiles, administrator or manufacturer dashboards, authentication flows, or external service integrations.
