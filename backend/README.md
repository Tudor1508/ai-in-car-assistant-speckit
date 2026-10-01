# Drive Wise Backend

The `backend/` area is the sole Python backend root. It owns authoritative
business rules, protected data operations, and authorization when product work
is introduced. The shared API and persistence foundations are technical
infrastructure only; this feature adds no product workflow or model.

## Structure

- `src/` is the source location for Python backend modules.
- `src/main.py` contains the minimal FastAPI application and technical health
	route.
- `src/api/` contains shared response schemas, error handlers, and OpenAPI
	response declarations for future operations.
- `src/data/` contains the configured SQLAlchemy engine and session boundary.
- `migrations/` contains the Alembic environment and infrastructure-only
	baseline revision.
- `tests/` contains backend checks.
- Future backend modules belong under `src/`; add product behavior only through a
	separate specification and explicit contract.

## Prerequisites

- Python 3.11, 3.12, or 3.13.
- PowerShell or another shell that can create and activate a Python virtual
	environment.
- SQLite is used only for local development and tests. No production database,
  credentials, or external service is selected.

## Local setup

From `backend/`, create and activate a virtual environment, then install the
runtime and development dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

The 004 direct dependency pins are Pydantic 2.13.5, SQLAlchemy 2.0.54, and
Alembic 1.20.0. Existing FastAPI 0.115.6, Uvicorn 0.34.0, httpx 0.28.1, and
pytest 8.3.4 pins remain unchanged.

Do not create placeholder secrets. `DRIVE_WISE_DATABASE_URL` optionally
overrides the default SQLite URL, which points to
`backend/data/drive_wise.sqlite3`. That directory is ignored by Git and created
when the database engine opens the local file. The default path is independent
of the shell's current directory. Tests use isolated temporary SQLite files.

Initialize or upgrade the local schema from `backend/`:

```powershell
python -m alembic upgrade head
```

The current baseline contains migration bookkeeping only; it creates no product
tables. Repeating the command leaves the database at the current revision.

## Verification

Run these commands from `backend/`:

```powershell
python -m compileall src
python -m pytest
```

The API convention is HTTP/JSON with FastAPI-generated OpenAPI 3.1. Future
operation contracts use a `{ "data": ... }` success envelope and an
`{ "error": { "code", "message", "details?", "request_id?" } }` error
envelope. Invalid input returns HTTP 422; unexpected errors return HTTP 500
with generic safe text. Internal diagnostics are not sent to clients. Contracts
are backward-compatible by default; no URL versioning is introduced now, and
an incompatible change requires an explicit decision and review. The generated
OpenAPI document is not committed; examples and full conventions are in
[`specs/004-api-and-data-foundation/contracts/api-conventions.md`](../specs/004-api-and-data-foundation/contracts/api-conventions.md)
and persistence details are in
[`specs/004-api-and-data-foundation/contracts/persistence.md`](../specs/004-api-and-data-foundation/contracts/persistence.md).

## Start locally

```powershell
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

The ready signal is Uvicorn reporting `http://127.0.0.1:8000`. In a second
terminal, check availability:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

The expected response is `{ "status": "ok" }`. Stop the server with `Ctrl+C`.

## Boundary

Frontend modules own presentation, user interaction, and client-side
coordination. Any future operation crossing the boundary must use an explicit
API contract defining request, response, and error shapes. Backend input
validation and authorization for protected operations remain backend
responsibilities. This foundation has no product endpoint, roles,
authentication, product tables, or external service integration. SQLite is
strictly the local/test store; no production database is selected.

The root [README](../README.md) is the repository contributor entry point.
