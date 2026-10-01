# Quickstart: Drive Wise Backend Setup

## Prerequisites

- Python 3.11, 3.12, or 3.13.
- A shell opened from `backend/`.
- No database, credentials, or external service.

## Prepare the environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

## Validate the source

```powershell
python -m compileall src
python -m pytest
```

Expected result: compilation succeeds and all tests pass.

## Start the backend

```powershell
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

Expected ready signal: Uvicorn reports that it is running on
`http://127.0.0.1:8000`.

## Check availability

In a second shell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected response:

```text
status
------
ok
```

Stop the server with `Ctrl+C`.

## Configuration

No environment variables or local configuration file are required for this
baseline. Do not create placeholder credentials.