# Quickstart Validation: API and Data Foundation

**Status**: Owner-approved decisions; documented commands verified against the implementation on Python 3.13.15.

## Prerequisites

- Python 3.11, 3.12, or 3.13, as approved in 003.
- A virtual environment created from `backend/requirements-dev.txt`.
- No external service or credential. The default local store is SQLite, not a production database.

## Setup

From the repository root in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

Approved exact direct pins for this feature: `pydantic==2.13.5`, `SQLAlchemy==2.0.54`, and `alembic==1.20.0`. The FastAPI 0.115.6, Uvicorn 0.34.0, pytest 8.3.4, and httpx 0.28.1 pins already present remain in place.

## Storage initialization

`DRIVE_WISE_DATABASE_URL` overrides the local default, which is a credential-free SQLite file under the Git-ignored backend data directory. Initialize or upgrade the local store from `backend/`:

```powershell
python -m alembic upgrade head
```

The initial schema contains migration bookkeeping only, with no product tables. Running the command again against the current store leaves the same revision.

## Automated verification

From `backend/`:

```powershell
python -m compileall src
python -m pytest
```

Expected checks:

1. Existing `GET /health` still returns HTTP 200 and `{ "status": "ok" }`.
2. API contracts use HTTP/JSON and FastAPI-generated OpenAPI 3.1; examples remain documented and the generated OpenAPI file is not committed.
3. Isolated test-only API requests cover success (`data` envelope), invalid input (HTTP 422), and unexpected failure (HTTP 500 with generic safe text). No test endpoint is mounted in the production app and no internal error detail is returned.
4. API contracts are backward-compatible by default; no URL versioning is introduced now.
5. Persistence tests use an isolated temporary store, verify initialize/write/read/cleanup, and leave no data in the contributor's default store.
6. Schema-evolution tests verify fresh-store upgrade and repeat execution on a current store.

The exact sequence will be checked from a clean environment after implementation and documented in `backend/README.md`.
