# Research: Drive Wise Application Skeleton

**Date**: 2026-09-30
**Sources**: [Feature specification](spec.md), [project constitution](../../.specify/memory/constitution.md), and repository [README](../../README.md).

## Findings

- The repository currently contains the Spec Kit configuration, the feature specification, and a generic GitLab starter README. It has no frontend or backend application source directories and no product startup instructions.
- The current README does not contain the legacy Drive Wise technology list. The list below comes from the feature request's description of the application being recreated; it is treated as context, not as verified repository configuration.
- The constitution fixes the frontend constraints to React, TypeScript, Redux, and MUI, and the backend language to Python. It leaves versions, framework, module layout, API protocol, persistence, authentication, and validation/test tooling open.
- The skeleton needs two discoverable ownership areas and contributor documentation. No product API, data model, authentication flow, persistence, map, or external service is needed to create those areas.

## Decisions and Open Choices

| Topic | Established constraint or legacy reference | Plan status |
|---|---|---|
| Frontend baseline | React, TypeScript, Redux, MUI are required by the constitution. Legacy description mentions Next.js. | Keep the required baseline. Frontend framework/build and local execution tool remain open; do not assume Next.js or a replacement. Resolve before selecting dependencies or publishing exact startup commands. |
| Styling | MUI is required by the constitution. Legacy description mentions Tailwind CSS. | MUI remains the established component system. Whether Tailwind CSS is retained alongside it or omitted is open; no styling package is added by this plan. |
| Mapping | Legacy description mentions Leaflet. | Mapping is a product feature and is out of scope. No mapping library is needed in the skeleton; revisit when an in-scope map feature is planned. |
| Backend framework | Python is required by the constitution. Legacy description mentions FastAPI. | Python remains the backend language. Framework and local server/execution approach are open; do not assume FastAPI or a replacement. Resolve before selecting dependencies or publishing exact startup commands. |
| Validation/schema library | Legacy description mentions Pydantic. | No API schemas or backend input boundary is introduced here. Library choice is open for the feature that introduces those contracts. |
| Persistence and migrations | Legacy description mentions SQLAlchemy and Alembic, but no database is mandated. | No database is required for the empty skeleton. Database, ORM, and migration choices remain open for a data-backed feature. |
| Authentication | Legacy description mentions JWT. The constitution requires backend-enforced authorization for protected operations but leaves identity and role details open. | No authentication or protected operation is implemented here. Authentication mechanism and authorization details remain open for the relevant feature. |
| External services | Legacy description mentions external services without establishing required providers in the current repository. | No service integration or configuration is needed for the skeleton. Provider and integration decisions remain out of scope. |
| Runtime, versions, package managers, quality tools | Not specified by the constitution or current README. | Open. Decide only the minimum needed to make the selected frontend and backend skeleton reproducibly start and validate; record the supported environment and commands in contributor documentation. |
| Cross-layer contract | Constitution requires explicit API contracts when modules communicate across the boundary. | Record the boundary rule now; defer protocol and request/response/error schemas until a feature introduces an actual operation. |

## Rationale

The smallest useful baseline is a repository layout and ownership guidance that can be established without deciding product capabilities. Frameworks, package managers, database systems, authentication, mapping, and service integrations add implementation choices that are not required to describe those ownership areas. The frontend and backend must eventually be runnable, so the minimum execution toolchain decisions are a prerequisite to final startup commands, but they must be explicit rather than inferred from the legacy description.

## Alternatives Considered

- Carrying every legacy technology into the skeleton was rejected because the constitution does not approve those additions and the requested task excludes product features and external integrations.
- Replacing every legacy technology was also rejected because the request explicitly says not to presume that old choices will be replaced.
- Defining API endpoints or a database schema was rejected because no product workflow or data requirement is in scope.