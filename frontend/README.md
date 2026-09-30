# Frontend

The `frontend/` area owns Drive Wise presentation, user interaction, and client-side coordination.

## Established Stack

The frontend uses Next.js 16.3.7 with App Router, React 19.3.0, TypeScript 5.9.3, Redux Toolkit 2.13.0 with React Redux 9.3.0, and Material UI 9.4.0. Dependencies are pinned in `package.json` and `package-lock.json`. Redux owns shared client state; transient interaction state may remain local to a component.

## Structure

- `src/` is the location for frontend source code.
- `tests/` is the location for frontend checks once their tooling is selected.

## Boundary

Authoritative business rules, protected data operations, and authorization belong to the Python backend. Any future operation crossing the frontend/backend boundary must use an explicit API contract. This skeleton defines no endpoint, transport, or request/response/error schema.

## Local Development

### Prerequisites

- Node.js 20.9.0 or newer
- npm

### Install and Run

From `frontend/`, install the locked dependencies and start the development server:

```sh
npm ci
npm run dev
```

The server reports ready at `http://localhost:3000`.

### Validate

```sh
npx tsc --noEmit
npm run build
npm run start
```

`npm run start` serves the production build and is run after `npm run build`. The root [README](../README.md) is the repository contributor entry point.

If installation reports an engine mismatch, confirm Node.js is at least 20.9.0. If dependency installation differs from the manifest, use `npm ci` to reproduce the committed lockfile rather than changing versions without approval.

No Drive Wise product workflow is implemented by this skeleton.