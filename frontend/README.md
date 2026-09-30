# Frontend

The `frontend/` area owns Drive Wise presentation, user interaction, and client-side coordination.

## Established Stack

The project constitution requires React, TypeScript, Redux, and Material UI (MUI). Redux is the owner of shared client state; transient interaction state may remain local to a component. Supported versions and the frontend framework/build tool have not been selected.

## Structure

- `src/` is the location for frontend source code.
- `tests/` is the location for frontend checks once their tooling is selected.

## Boundary

Authoritative business rules, protected data operations, and authorization belong to the Python backend. Any future operation crossing the frontend/backend boundary must use an explicit API contract. This skeleton defines no endpoint, transport, or request/response/error schema.

## Local Development

Exact prerequisites and startup commands are pending explicit approval of the minimum frontend toolchain. Do not infer a framework or package manager from the legacy application description. The root [README](../README.md) is the contributor entry point.

No Drive Wise product workflow is implemented by this skeleton.