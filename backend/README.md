# Drive Wise Backend

The FastAPI backend owns account authentication and authorization, vehicle
records, trip validation and route planning, provider requests, and favorite
route persistence. ORS credentials remain server-side. SQLite is used for local
development and tests.

## Setup

Use Python 3.11–3.13. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Fill the ignored `.env` from `.env.example`. Configure exact allowed frontend
origins and server bind address/port. Add a HeiGIT API key locally; provider
URL, timeouts, POI categories, and trip limits use built-in defaults. For live integration
coverage, configure the documented `TRIP_TEST_*` account, vehicle, place, and
range inputs. Never put credentials or real test account details in examples or
commits. `DRIVE_WISE_DATABASE_URL` may select a local SQLite database; otherwise
the backend uses its ignored local database file.

## Run

```powershell
python -m alembic upgrade heads
python scripts/create_admin.py
python -m uvicorn src.main:app --host $env:DRIVE_WISE_API_HOST --port $env:DRIVE_WISE_API_PORT --env-file .env
```

`create_admin.py` prompts for a name, email, and password (the password is not
echoed) and uses the configured local SQLite database. Run migrations first.
The database permits one administrator; a second provisioning attempt exits
without changing account data. Keep the database URL pointed at the intended
local store and never put credentials in shell history or documentation.
Public registration continues to create ordinary users. Administrators create
producers from the dashboard with a name, free-text brand, email, and password;
producers sign in through the existing email/password flow.

`GET /health` retains its `{ "status": "ok" }` response. Authenticated trip
operations are mounted under `/trips`; preview and favorite creation require
CSRF protection. Favorite reads and writes are scoped to the signed-in account.
The `TripFavorite` migration stores only endpoint labels and coordinates.

## Verify

```powershell
python -m compileall src
python -m pytest
```

Trip integration tests call the configured live ORS service through the real
FastAPI router. They require a valid locally configured credential and named
queries/ranges. They do not use provider mocks, fixed coordinates, or response
fixtures. See the [Feature 007 quickstart](../specs/007-trip-planning-dashboard/quickstart.md)
for scenarios and provider constraints.
