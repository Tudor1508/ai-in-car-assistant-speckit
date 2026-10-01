# Implementation Plan: Drive Wise API and Data Foundation

**Branch**: `004-api-and-data-foundation` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-api-and-data-foundation/spec.md`

**Status**: Approved design — owner decisions recorded on 2026-10-01. Exact dependency compatibility was checked before installation.

## Summary

Extend the existing FastAPI backend with reusable HTTP/JSON API contract conventions, request validation and safe error responses, and a local persistence foundation that can be tested without product data or external services. Retain the approved 003 runtime, framework, server, package installer and test runner. Use SQLite only for local development and temporary tests, SQLAlchemy 2.x for data access, and Alembic for schema evolution. Define API contracts in FastAPI-generated OpenAPI 3.1 without committing a generated OpenAPI file. Future success responses use a `data` envelope and errors use the approved safe `error` schema. These decisions were approved by the owner on 2026-10-01.

This plan adds no authentication, roles, product endpoints, product models, trip or vehicle behavior, or external integrations. The current `/health` response remains unchanged.

## Technical Context

**Language/Version**: Python 3.11, 3.12, and 3.13; Python 3.13 is the verified local runtime, retained from 003.

**Primary Dependencies**: Retain FastAPI 0.115.6, Uvicorn 0.34.0, `pip`, and `pytest` 8.3.4 from 003. Owner-approved direct pins: Pydantic 2.13.5, SQLAlchemy 2.0.54, and Alembic 1.20.0. Pydantic supplies request/response schemas integrated with FastAPI's generated OpenAPI 3.1 contract.

**Storage**: SQLite file for local development and automated checks, configured by `DRIVE_WISE_DATABASE_URL`. Its default is a credential-free file in a Git-ignored directory under `backend/`. SQLite is not selected as a production database. Tests use a temporary isolated store and clean up after execution.

**Testing**: Retain `python -m compileall src` and `python -m pytest`. Add automated contract checks for success, invalid input, and unexpected failure; persistence checks for initialize, write/read, cleanup; and migration checks against a fresh and already-current temporary store. The persistence path must not require a remote service.

**Target Platform**: Local contributor environments supported by the 003 Python runtime range; no deployment target is introduced.

**Project Type**: Python web service backend.

**Performance Goals**: No product throughput or latency objective is introduced. Local persistence and contract tests must complete as part of the documented contributor check sequence; do not add performance infrastructure.

**Constraints**: Preserve the 003 technical health route contract. Do not require external credentials, network services, authentication, or product data. An API contract is backward-compatible by default; any incompatible change requires an explicit decision and review. No URL versioning mechanism is introduced now.

**Scale/Scope**: One backend package; shared contract/error infrastructure; local persistence and schema evolution; one technical-only contract example and one temporary persistence fixture. No product API or product entity.

## Approved Decisions and Options Considered

The owner approved the decisions below on 2026-10-01. The old application README remains historical context only and was not treated as approval.

| Decision | Options considered in repository context | Approved choice and rationale | Approval |
|---|---|---|---|
| API protocol | HTTP/JSON already exists for `/health`; another protocol adds a transport and tooling. | **HTTP/JSON**, retaining FastAPI and the existing service boundary. | Approved 2026-10-01 |
| Contract format | OpenAPI document; Markdown-only; separate schema format. | **FastAPI-generated OpenAPI 3.1**; examples remain in docs and generated OpenAPI is not committed. | Approved 2026-10-01 |
| Success response | Direct operation values; common envelope. | **`{ "data": ... }` for future operations**; `/health` remains `{ "status": "ok" }`. | Approved 2026-10-01 |
| Error response | Framework default; Drive Wise error object; problem-details. | **`{ "error": { "code", "message", "details?", "request_id?" } }`**; invalid input is HTTP 422; unexpected failures are HTTP 500 with generic safe text and no internal details. | Approved 2026-10-01 |
| API compatibility | Feature-specific; compatible by default; complete URL/header version policy. | **Backward-compatible by default.** No URL versioning now; incompatible changes require explicit decision and review. | Approved 2026-10-01 |
| Request schema and validation | Framework-native; manual dictionaries; separate schema library. | **Pydantic 2.x**, direct pin 2.13.5, integrated with FastAPI; validate at request boundary. | Approved 2026-10-01 |
| Local persistence store | SQLite file; PostgreSQL service; in-memory test store. | **SQLite for local foundation and temporary tests only.** No production database selected. | Approved 2026-10-01 |
| Data-access layer | stdlib `sqlite3`; SQLAlchemy 2.x; thin direct-SQL repository. | **SQLAlchemy 2.x**, direct pin 2.0.54, narrow engine/session boundary, no product models. | Approved 2026-10-01 |
| Schema evolution | Versioned SQL; Alembic; none. | **Alembic 1.x**, direct pin 1.20.0; infrastructure-only baseline, no product tables. | Approved 2026-10-01 |
| Configuration | Hard-coded path; environment variable; settings file. | **`DRIVE_WISE_DATABASE_URL`**, default credential-free SQLite file under a Git-ignored backend directory. | Approved 2026-10-01 |
| Automated verification | pytest; new test frameworks; manual only. | **Keep pytest 8.3.4, httpx/TestClient, and compileall; add no testing framework.** Use temporary SQLite stores and migration checks. | Approved 2026-10-01 |

### Dependency compatibility research and approval record

The owner approved the decisions above on 2026-10-01 and asked for stable exact pins compatible with Python 3.11 to 3.13 and the existing backend before installation. Selected direct pins: `pydantic==2.13.5`, `SQLAlchemy==2.0.54`, and `alembic==1.20.0`. PyPI metadata reports Python >=3.9, >=3.7, and >=3.10 respectively, with classifiers covering Python 3.11 to 3.13. FastAPI 0.115.6 permits Pydantic `<3`; the existing FastAPI/Pydantic pair imports and runs. A pip resolver dry run on Python 3.13.15 using all retained 003 pins and these additions succeeded, resolving SQLAlchemy's greenlet and Alembic's Mako dependencies without conflicts. No packages were installed during the dry run. The 003 pins FastAPI 0.115.6, Uvicorn 0.34.0, and pytest 8.3.4 remain unchanged.

## Constitution Check

*GATE: PASS. Owner approvals and exact pins are recorded above.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | Changes stay under `backend/`; backend remains authority for business rules and protected data operations. No frontend changes or product operations are added. | PASS |
| II. Compatible, Reusable Frontend | No frontend implementation changes. The approved envelopes are documented so future frontend consumers can implement the contract. | PASS |
| III. One Authority for Shared Client State | No frontend state is introduced. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | OpenAPI 3.1 and documented request/response/error shapes are approved; input validation is required. No protected operation is added. | PASS |
| V. Verified, Accessible User Outcomes | Contract and persistence checks are planned; there is no user-facing interface. | PASS |
| Technology Constraints and Open Decisions | 003-approved Python/FastAPI/Uvicorn/pip/pytest choices are retained. HTTP/JSON, Pydantic, SQLite-local-only, SQLAlchemy, and Alembic choices are owner-approved and pinned. | PASS, owner decisions recorded |
| SDD Development and Review | Design artifacts trace decisions to the spec and mark all new implementation choices for owner review before tasks/implementation. | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/004-api-and-data-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── api-conventions.md
    └── persistence.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── __init__.py
│   ├── main.py                         # Existing app and unchanged /health route
│   ├── api/                            # Approved shared request/error handling
│   └── data/                           # Approved store setup and session boundary
├── tests/
│   ├── test_health.py                 # Existing test; unchanged
│   ├── test_api_conventions.py         # Technical contract behavior only
│   ├── test_persistence.py             # Temporary non-product record lifecycle
│   └── test_schema_evolution.py        # Fresh/current local store behavior
├── migrations/                         # Alembic revision scripts/configuration
├── requirements.txt                    # Existing pins plus approved runtime dependencies
├── requirements-dev.txt                # Existing test dependencies, only if additions needed
└── README.md                            # Shared API, config, setup, and verification guide
```

**Structure Decision**: Extend the established `backend/src/` package and `backend/tests/`; do not create another service or move the current health route. `api/` and `data/` are internal boundaries. Place Alembic assets under `backend/migrations/`. Exact module names and package organization can be finalized in tasks without changing the externally visible requirements.

**Configuration Decision**: `DRIVE_WISE_DATABASE_URL` defaults to a credential-free SQLite URL pointing to a file under a Git-ignored backend data directory, resolved independently of the caller's working directory. No remote credential is introduced.

**Contract Decision**: Approved HTTP/JSON and FastAPI-generated OpenAPI 3.1. Future product operations use a success envelope `{ "data": ... }`; errors use `{ "error": { "code": ..., "message": ..., "details": ..., "request_id": ... } }`, omitting optional fields when unavailable. Use HTTP 422 for invalid input and HTTP 500 with a generic safe message for unexpected failures. The `/health` response is explicitly excluded and remains `{ "status": "ok" }`. Tests exercise a separate test-only app/handler fixture so no product or test endpoint is shipped. Final field names, statuses and compatibility rules are as approved by the owner in the contract artifact.

**Persistence Decision**: Approved SQLite + SQLAlchemy 2.x + Alembic for local development, with a temporary isolated SQLite database for automated checks. No product table/model is introduced; a temporary technical fixture is created only in test scope and removed after verification. No production database or hosting decision is made.

**Verification Decision**: Preserve compile and pytest checks. Add repeatable tests for the API contract success/invalid-input/unexpected-failure paths using a test-only app/handler fixture; persistence initialize/write/read/cleanup; and schema setup on fresh and already-current stores. Document prerequisites and exact commands in `quickstart.md` and `backend/README.md` and verify them against a clean checkout before acceptance.

## Dependencies and Sequencing

1. Approved protocol, contract convention, exact dependencies, local storage, data-access, migration, and compatibility decisions are recorded above and in the contract artifacts.
2. Update dependency declarations while preserving all existing 003 pins.
3. Implement shared API contract/error handling and persistence/migration foundations under `backend/src/`.
4. Add isolated contract and persistence verification, then document the approved local workflow.
5. Run the full documented clean-checkout sequence; review scope and constitution compliance before accepting.

There is no external runtime service dependency in the approved local configuration. Any future change to a service-dependent database or contract tool requires revising scope, prerequisites, and failure checks.

## Complexity Tracking

No constitution exception is proposed. SQLAlchemy/Alembic and a shared API envelope add a documented dependency and compatibility cost; the owner approved these choices for reuse in subsequent features.
