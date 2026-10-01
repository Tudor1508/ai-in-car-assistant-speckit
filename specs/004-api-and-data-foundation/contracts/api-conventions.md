# API Contract Conventions

**Approval status**: Owner-approved 2026-10-01. HTTP/JSON, FastAPI-generated OpenAPI 3.1, envelope fields, status mapping, Pydantic validation, and compatibility principle are approved.

## Boundary

- Keep the existing technical `GET /health` contract unchanged: HTTP 200 and `{ "status": "ok" }`.
- Apply these conventions to future product operations only. This feature adds no product endpoint.
- Validate request data at the backend boundary against the declared request contract.
- Generate OpenAPI 3.1 from FastAPI. Keep examples in documentation; do not commit a generated OpenAPI file.

## Request description

Each operation contract records its HTTP method and path, request parameters/body and content type, required/optional fields, constraints, and possible outcomes. Request and response schemas use Pydantic 2.x and appear in generated OpenAPI. No authentication is introduced by this feature.

## Successful response

Future product operations return HTTP/JSON in the following form:

```json
{
  "data": {
    "...": "operation-specific response fields"
  }
}
```

The concrete fields under `data` are owned by each feature contract. Optional metadata is added only when an operation needs it and must be documented. This envelope does not alter `/health`.

## Error response

```json
{
  "error": {
    "code": "stable_machine_readable_code",
    "message": "Safe explanation suitable for the client",
    "details": [],
    "request_id": "correlation identifier when available"
  }
}
```

`details` and `request_id` are optional. Field-level details may describe client-correctable validation failures. Invalid input returns HTTP 422. Unexpected failures return HTTP 500 with a generic safe code/message. Exception strings, stack traces, secrets, and internal paths are never returned.

## Behavior examples

| Outcome | Required behavior |
|---|---|
| Valid test-fixture request | HTTP 2xx and the `{ "data": ... }` success shape. |
| Invalid request field or constraint | HTTP 422 and the common error shape, with safe field details where useful. |
| Unexpected internal failure | HTTP 500 and generic safe error shape; diagnostic detail remains server-side. |

Automated contract checks prove all three outcomes against an isolated test application or handler fixture; no test endpoint is shipped in the product application. Other status/code mappings are defined by the feature that first needs them and documented in the generated contract.

## Compatibility

Published contract changes are backward-compatible by default. A breaking change requires an explicit decision and review of affected consumers. No URL versioning mechanism is introduced now. If future requirements call for breaking changes, decide the version identifier and mechanism then.
