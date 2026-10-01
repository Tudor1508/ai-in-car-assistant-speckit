# Quickstart: Vehicle Management Validation

This guide describes how implementation will be validated end-to-end. It does not run checks during planning.

## Prerequisites

- Python 3.11–3.13 and Node.js 20.9+ with npm.
- Existing project dependencies installed using `backend/requirements-dev.txt` and `frontend/package-lock.json`.
- A local frontend/backend environment following [`backend/README.md`](../../backend/README.md) and [`frontend/README.md`](../../frontend/README.md).
- The backend configured for a temporary SQLite database and `DRIVE_WISE_ALLOWED_ORIGINS=http://localhost:3000`.

## Start a local environment

From `backend/`, create/activate the project virtual environment if needed, then apply migrations and start the service:

```powershell
python -m alembic upgrade head
python -m uvicorn src.main:app --host localhost --port 8000
```

From `frontend/`, run the Next.js app:

```sh
npm ci
npm run dev
```

Register or use a test account and sign in at `/login`. The browser session and CSRF handling use the existing authentication flow.

## Validation scenarios

1. Open `/vehicles` while signed in. Verify an empty garage has a clear message and Add vehicle action. Then create one combustion vehicle and one electric vehicle, verifying all fields and units render and electric fuel type says “Not applicable”.
2. Edit each vehicle, including changing mileage; reload `/vehicles` and confirm persisted values appear once with stable ordering.
3. Try blank/overlong name or model, future/too-early year, negative/fractional distances, unknown type/fuel, and invalid type/fuel combinations. Verify no invalid record persists and accessible field errors identify the issue.
4. Delete one vehicle and confirm removal. Start another deletion and cancel; verify that record remains.
5. Verify the shared navbar on `/vehicles` and `/profile`, the active-page indicator, keyboard navigation, narrow viewport usability, and absence from `/login` and `/register`.
6. With two accounts, verify each list contains only its owner's vehicles. Attempt direct GET/PATCH/DELETE against another account's vehicle ID and verify a safe 404 and no data change.
7. Simulate an unavailable API or failed request; verify recoverable user feedback and that the last known list is not silently discarded.
8. Verify unauthenticated access is redirected by the UI and independently denied by the backend. Verify unsafe calls without valid CSRF/origin are denied.
9. Verify `/health` remains HTTP 200 `{ "status": "ok" }`.

## Automated checks

From `backend/`:

```powershell
python -m compileall src
python -m pytest
```

From `frontend/`:

```sh
npm run type-check
npm run build
npm run test:e2e
```

Coverage should include API schema/envelopes and validation, owner authorization matrix, isolated SQLite persistence/migration, browser CRUD and cancellation flows, retry/error states, navigation, keyboard use, and narrow/wide viewports. See [vehicles-api.md](contracts/vehicles-api.md), [vehicles-ui.md](contracts/vehicles-ui.md), and [data-model.md](data-model.md) for detailed expected behavior.
