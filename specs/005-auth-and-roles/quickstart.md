# Feature 005: Local setup and verification

Approved dependency additions are `argon2-cffi==25.1.0` and
`@playwright/test==1.56.1`; existing 003/004 pins remain unchanged. Email stays
unverified and no email delivery or verification service is configured.

## Backend

From `backend/`, activate the project `.venv`, install
`requirements-dev.txt`, then run:

```powershell
python -m alembic upgrade head
python -m compileall src
python -m pytest
```

Backend tests use isolated temporary SQLite databases. Local browser access
uses the exact allowlisted origin `DRIVE_WISE_ALLOWED_ORIGINS=http://localhost:3000`.
The normal local SQLite file is ignored by Git; no production database is
selected.

## Frontend and browser tests

From `frontend/`:

```sh
npm ci
npx playwright install chromium
npm run type-check
npm run build
npm run test:e2e
```

The standard browser setup downloads Playwright-managed Chromium. For the
verified Windows run when that download is unavailable, use installed Edge as
the Chromium executable:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:e2e
```

The Playwright config starts a backend with a unique temporary SQLite file,
applies migrations, and starts Next.js. The browser uses localhost, a secure
context for the Secure cookie. No production cookie attribute is weakened for
testing.

## Security and contract checks

`POST /auth/csrf/bootstrap` returns `{ "data": { "csrf_token": "..." } }` and
sets `__Host-dw_session`. Mutations send the token in `X-CSRF-Token` and require
strict Origin/Referer checks. Anonymous CSRF state is separate and expires
after 30 minutes idle or 8 hours absolute. Login revokes that context and
rotates to a new authenticated cookie identifier and CSRF token. The cookie is
Secure, HttpOnly, SameSite=Lax, Path=/, without Domain.

The server stores only Argon2id password verifiers, opaque session identifier
digests, and CSRF token digests. Approved Argon2id parameters are 19 MiB memory,
2 iterations, parallelism 1. Ten local Python 3.13.15 Windows samples measured
0.0308?0.0548 seconds to hash (median 0.0380) and 0.0281?0.0482 seconds to
verify (median 0.0385). The Python launcher listed only 3.13; Python 3.11 and
3.12 were unavailable for measurement. These local observations are not a
performance SLA and do not change the approved parameters.

The account email is displayed with `email_verified: false`; no email provider,
verification workflow, or delivery credentials are used. The frontend keeps
the CSRF token in memory only. Public registration assigns only the ordinary
`user` role. All three roles can manage only their own account in this feature.
