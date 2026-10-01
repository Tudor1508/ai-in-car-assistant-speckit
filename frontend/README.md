# Drive Wise Frontend

The frontend uses Next.js 16 App Router, React 19, TypeScript, Redux Toolkit,
and MUI 9. Public authentication screens live under `/login` and `/register`.
The authenticated account layout shares navigation between `/profile` and
`/vehicles`; vehicle data is held in the vehicles Redux slice and loaded through
the shared credentialed API client. Route-planning and trip-history screens are
not implemented yet.

## Local Development

Prerequisites: Node.js 20.9+ and npm. From `frontend/`:

```sh
npm ci
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` if the backend runs on a
different origin. The backend must allow the exact frontend origin, normally
`DRIVE_WISE_ALLOWED_ORIGINS=http://localhost:3000`. Both browser and API use
localhost so the approved Secure cookie works in the browser secure context.

## Verify

```sh
npm run type-check
npm run build
npx playwright install chromium
npm run test:e2e
```

The standard run uses Playwright-managed Chromium. On Windows, when that
browser download is unavailable but Microsoft Edge is installed, the same
Chromium-backed suite can use Edge with:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:e2e
```

The feature 005 verification run used this Edge executable; the test suite
still exercises Chromium behavior and does not change the production browser
or cookie policy.

The exact approved browser test dependency is `@playwright/test==1.56.1`.
Playwright starts the frontend and a backend process with a unique temporary
SQLite file, applies migrations, then removes the file. Browser requests use
the feature 004 `{data: ...}` / `{error: ...}` envelopes. The client keeps the
raw CSRF token in memory only and sends it in `X-CSRF-Token`; it never reads or
stores the HttpOnly session cookie.

Registration never presents a role selector. Profiles show the email as
`Neverificat`, a read-only role, and only own-account actions. The account
screens follow the visual references in `docs/reference-ui/login.png`,
`register.png`, and `profile.png`, excluding out-of-scope product navigation.
