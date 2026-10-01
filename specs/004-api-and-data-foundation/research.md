# Research: API and Data Foundation

**Feature**: `004-api-and-data-foundation`
**Status**: Owner-approved decisions and compatibility research, recorded 2026-10-01 before dependency installation.

## Repository Findings

- `specs/003-backend-setup/plan.md` approves Python 3.11–3.13 (3.13 verified locally), FastAPI 0.115.6, Uvicorn 0.34.0, `pip` with requirements files, pytest 8.3.4, and a technical `GET /health` returning `{ "status": "ok" }`.
- The existing service has no database, persistence, product API, or data model. The health contract is intentionally technical and must remain unchanged.
- The constitution requires documented request, response, and error shapes, backend input validation, and no exposure of secrets or internal error details. It leaves API protocol/schema and persistence choices open.
- The legacy README lists FastAPI, SQLAlchemy, Pydantic, Alembic, SQLite, and PostgreSQL. Only FastAPI is separately approved by the 003 plan; the README supplies no approval for the remaining technologies.

## Decisions and Alternatives

### 1. API protocol

**Approved decision**: HTTP/JSON feature operations using the existing FastAPI service.

**Rationale**: The already approved backend is an HTTP web service and the constitution describes frontend/backend API contracts. Reusing it avoids introducing a second transport or service boundary.

**Alternatives considered**:
- A different protocol: no repository requirement supports an additional transport, so it would add scope and tooling.
- Treat the existing health route as the product convention: rejected because 003 explicitly defines it as technical-only and its bare response is not a general product contract.

**Approval**: Owner approved 2026-10-01. FastAPI's presence in the old README was not the basis for approval.

### 2. Contract representation

**Approved decision**: FastAPI-generated OpenAPI 3.1 as the machine-readable contract. Keep examples in documentation; do not commit a generated OpenAPI file.

**Rationale**: It makes request, success, and error shapes inspectable for both frontend and backend contributors. FastAPI supports generating such a document, but an emitted document alone is insufficient unless common error responses are represented and tested.

**Alternatives considered**:
- Markdown-only documents: low tooling cost and readable, but no machine-readable consistency check.
- A standalone schema format: can be explicit, but duplicates responsibilities already served by the selected web framework and adds another tool.

**Approval**: Owner approved 2026-10-01, including version and generation/commit policy.

### 3. Request schema and validation

**Approved decision**: Pydantic 2.x typed schemas, directly pinned at 2.13.5, integrated with FastAPI and validated at the request boundary.

**Rationale**: Validation and documented schemas should describe the same boundary. FastAPI's existing integration is a practical option, but accepting it as a transitive framework detail would hide a meaningful dependency and design decision.

**Alternatives considered**:
- Manual dictionary validation: minimizes dependencies but risks inconsistent validation and documentation.
- A separate validation library: viable, but needs integration work and is not indicated by the repository.

**Approval**: Owner approved 2026-10-01.

### 4. Success and error shape

**Approved decision**: Future product success bodies use a `data` envelope. Errors use `error` with `code`, safe `message`, optional `details`, and optional `request_id`. Invalid input maps to HTTP 422; unexpected failures map to HTTP 500 with a generic message. Keep `/health` unchanged.

**Rationale**: A common shape gives frontend consumers one predictable parsing path. A generic error message for unexpected failures prevents internal exception details from escaping. Field details are appropriate for client-correctable validation failures.

**Alternatives considered**:
- Operation-specific top-level success values: simpler and often idiomatic; less uniform for a shared frontend client.
- Framework-default error objects: convenient but may not satisfy consistent cross-operation shape and safe-detail requirements.
- Problem-details format: standardized alternative; would be a reasonable replacement if the owner prefers it.

**Approval**: Owner approved 2026-10-01.

### 5. Contract compatibility

**Approved decision**: Published contracts are backward-compatible by default. No URL versioning is introduced now; any incompatible change requires explicit decision and review.

**Rationale**: The constitution calls for compatibility policy to be resolved, and future API contracts may have frontend consumers. Defining a principle now prevents silent breaking changes without selecting URL/header mechanics prematurely.

**Alternatives considered**:
- Leave every compatibility decision to each feature: flexible but risks contradictory contract evolution.
- Define a complete API versioning mechanism now: premature before the first product endpoint and its deployment/client lifecycle are known.

**Approval**: Owner approved 2026-10-01.

### 6. Local persistence store

**Approved decision**: SQLite file for local contributor setup and temporary tests only, configured by `DRIVE_WISE_DATABASE_URL`; each automated check uses an isolated temporary database. No production database is selected.

**Rationale**: It enables real persistence checks without a running external service and makes clean-checkout onboarding practical. The plan makes no claim that SQLite is the production database or is suitable for future deployment scale.

**Alternatives considered**:
- PostgreSQL: offers a server database representative of many deployments, but requires a service/container and environment management not present in repository scope.
- In-memory SQLite: very easy to isolate but does not prove file-backed local persistence behavior.
- Standard-library file storage: avoids a database dependency but does not establish the requested reusable database persistence foundation.

**Approval**: Owner approved 2026-10-01. SQLite/PostgreSQL in the legacy README were context only.

### 7. Data-access approach

**Approved decision**: SQLAlchemy 2.x, pinned at 2.0.54, with a small engine/session boundary; no product models in this feature.

**Rationale**: A reusable data-access boundary can support later domain features. The current Python backend is small, so this introduces meaningful dependency/abstraction cost and must be justified by anticipated reuse rather than legacy inheritance.

**Alternatives considered**:
- Standard-library `sqlite3`: smallest setup and adequate for SQLite-only use, but couples later features to SQLite unless a data-access boundary is designed explicitly.
- Direct SQL with a repository interface: thinner abstraction, but still requires connection, transaction, and schema lifecycle conventions.

**Approval**: Owner approved 2026-10-01; session/transaction ownership remains an implementation detail constrained by the persistence contract.

### 8. Schema evolution

**Approved decision**: Alembic 1.x, pinned at 1.20.0, for ordered schema revisions paired with SQLAlchemy. Initial migration establishes only migration metadata; no product tables are added.

**Rationale**: Later product features will need reviewable schema changes; a standard migration history verifies fresh/current behavior and avoids a custom revision ledger.

**Alternatives considered**:
- Versioned SQL scripts with a small ledger: fewer dependencies, but the project owns ordering, recording, and repeatability behavior.
- Defer migrations: avoids a tool now but fails the specification's requirement to demonstrate repeatable schema evolution.

**Approval**: Owner approved 2026-10-01. Alembic in the legacy README was not treated as approval.

### 9. Configuration and verification

**Approved decision**: One `DRIVE_WISE_DATABASE_URL` setting with a credential-free local SQLite default under a Git-ignored backend data directory. Preserve compileall and pytest 8.3.4; extend existing pytest/TestClient-based checks and use temporary local stores. Add no testing framework.

**Rationale**: A single explicit setting supports contributor overrides without requiring secrets or a new configuration framework. Existing check tools can verify contract and persistence behavior without another test runner.

**Alternatives considered**:
- Hard-coded path only: simpler but less usable for isolated test and contributor environments.
- A settings framework: provides richer parsing but is not warranted by one local setting.
- Manual-only verification: insufficient for repeatable API error and persistence lifecycle guarantees.

**Approval**: Owner approved 2026-10-01. Existing pytest is retained from 003.

## Dependency and Version Policy

Keep the 003-approved pins unchanged: FastAPI 0.115.6, Uvicorn 0.34.0, pytest 8.3.4. Add direct pins `pydantic==2.13.5`, `SQLAlchemy==2.0.54`, and `alembic==1.20.0`. PyPI metadata and a pip resolver dry run on Python 3.13.15 confirmed compatibility with the existing stack and Python 3.11–3.13 range before installation. The dry run resolved `greenlet` and `Mako` without conflicts. The old README is not an approval source.
