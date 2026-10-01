# Drive Wise Backend

`backend/` is the Python backend root. It owns input validation, authentication,
and authorization for protected account operations. Feature 005 adds account
self-service only; it does not add product workflows.

## Structure

- `src/main.py`: FastAPI application, exact-origin credentialed CORS, auth router,
  and unchanged `GET /health` contract.
- `src/auth/`: account registration/profile, Argon2id passwords, server sessions,
  CSRF contexts, cookies, and authorization boundaries.
- `src/data/`: SQLAlchemy engine/session and the Account, AuthSession, and
  AnonymousCsrfContext models.
- `migrations/`: Alembic baseline and auth schema revision.
- `tests/`: temporary SQLite persistence, API, security, and authorization tests.

## Prerequisites and Setup

Use Python 3.11–3.13. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
```

Approved new runtime dependency: `argon2-cffi==25.1.0`. Existing approved
FastAPI, Uvicorn, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, httpx,
and pytest pins are unchanged. SQLite is used only for local development and
tests; no production database is selected.

Copy values from [`.env.example`](.env.example) into the local environment if
needed. `DRIVE_WISE_ALLOWED_ORIGINS` is a comma-separated allowlist of exact
browser origins, for example `http://localhost:3000`; wildcard origins are
rejected. `DRIVE_WISE_DATABASE_URL` optionally selects a local SQLite file. The
default is ignored `backend/data/drive_wise.sqlite3`. No email credentials or
other secrets are needed. Email addresses remain unverified and no email
delivery is configured.

## Run and Verify

```powershell
python -m uvicorn src.main:app --host localhost --port 8000
python -m compileall src
python -m pytest
```

The health response remains `{ "status": "ok" }`. API success and error
envelopes follow feature 004. OpenAPI 3.1 is generated at `/openapi.json` and is
not committed.

Sessions use `__Host-dw_session` with Secure, HttpOnly, SameSite=Lax, and Path=/.
Sessions expire after 30 minutes idle or 8 hours absolute. State-changing calls
require strict Origin/Referer validation and the synchronizer token in
`X-CSRF-Token`. Bootstrap is `POST /auth/csrf/bootstrap`; it returns
`{ "data": { "csrf_token": "..." } }`. Anonymous CSRF contexts are stored
separately from authenticated sessions. Login revokes the anonymous context
and rotates to a new session identifier and token. Only token/session digests
are stored.

Passwords use Argon2id with 19 MiB memory, 2 iterations, and parallelism 1.
On the implementation machine (Python 3.13.15, Windows), ten local samples
showed hash times of 0.0308?0.0548 seconds (median 0.0380) and verify times of
0.0281?0.0482 seconds (median 0.0385). The launcher reports Python 3.13 only;
Python 3.11 and 3.12 were unavailable, so those runtimes could not be measured.
These local observations are not an SLA. The approved Argon2id parameters were
not changed.

Public registration assigns only `user`. A trusted operator assigns or changes
privileged roles outside this feature, which revokes active sessions. Every
role can manage only its own profile and password. Vehicle CRUD is mounted at
`/vehicles`; every operation uses the signed-in account as owner, and writes
require the existing CSRF protection. Admin/producer dashboards, routes,
history, email delivery, and production database support remain out of scope.
