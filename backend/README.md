# Backend

The `backend/` area is the Python-owned authority for Drive Wise business rules, protected data operations, and authorization.

## Structure

- `src/` is the location for Python backend modules; the internal package layout remains open until an execution/framework decision is approved.
- `tests/` is the location for backend checks once their tooling is selected.

## Boundary

Frontend modules own presentation, user interaction, and client-side coordination. Any future operation crossing the boundary must use an explicit API contract that defines request, response, and error shapes. Backend input validation and authorization for protected operations remain backend responsibilities. This skeleton defines no endpoints, roles, persistence, or API protocol.

## Local Development

Exact prerequisites and startup commands are pending explicit approval of the minimum Python runtime and backend execution approach. Do not infer a framework or package manager from the legacy application description. The root [README](../README.md) is the contributor entry point.

No Drive Wise product workflow is implemented by this skeleton.