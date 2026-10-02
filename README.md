# Drive Wise

Drive Wise is a two-project web application. The frontend uses Next.js, React,
TypeScript, Redux Toolkit, MUI, and Leaflet. The backend uses FastAPI, SQLAlchemy,
and SQLite for local development. The backend owns authentication, vehicle data,
trip calculations, provider access, and account-scoped favorite routes.

## Feature 007: Trip Planning Dashboard

The signed-in dashboard is available at `/`. Users can choose suggested places,
select one of their vehicles, preview a range-aware route, and save favorite
origin/destination pairs. `/profile` and `/vehicles` remain available from the
account navigation. OpenRouteService credentials are used by the backend only.

## Local development

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env.local`, then fill the values for the local setup. Use a rotated
OpenRouteService key in the ignored backend file. Keep test account inputs
private and use environment-supplied place queries and ranges; the examples
contain placeholders only.

Install dependencies with `python -m pip install -r requirements-dev.txt` from
`backend/` and `npm ci` from `frontend/`. Apply the database schema and start the
services in separate shells:

```powershell
# backend/
python -m alembic upgrade heads
python -m uvicorn src.main:app --host $env:DRIVE_WISE_API_HOST --port $env:DRIVE_WISE_API_PORT --env-file .env

# frontend/
npm run dev -- --hostname $env:DRIVE_WISE_FRONTEND_HOST --port $env:DRIVE_WISE_FRONTEND_PORT
```

See [backend setup](backend/README.md), [frontend setup](frontend/README.md),
and the [Feature 007 quickstart](specs/007-trip-planning-dashboard/quickstart.md)
for configuration names, verification commands, and live integration scenarios.
