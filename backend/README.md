# Drive Wise Backend

The `backend/` area is the sole Python backend root. It owns authoritative
business rules, protected data operations, and authorization when product work
is introduced. The current feature provides only a technical availability check;
it does not implement a product workflow.

## Structure

- `src/` is the source location for Python backend modules.
- `src/main.py` contains the minimal FastAPI application and technical health
	route.
- `tests/` contains backend checks.
- Future backend modules belong under `src/`; add product behavior only through a
	separate specification and explicit contract.

## Prerequisites

- Python 3.11, 3.12, or 3.13.
- PowerShell or another shell that can create and activate a Python virtual
	environment.
- No database, credentials, or external service.

## Local setup

From `backend/`, create and activate a virtual environment, then install the
runtime and development dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

No environment variables or local configuration file are required for this
baseline. Do not create placeholder secrets.

## Verification

Run these commands from `backend/`:

```powershell
python -m compileall src
python -m pytest
```

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
responsibilities. This baseline has no product endpoint, roles, persistence,
authentication, database, or external service integration.

The root [README](../README.md) is the repository contributor entry point.