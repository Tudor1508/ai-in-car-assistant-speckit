# Implementation Plan: Vehicle Image Preview

**Branch**: `013-vehicle-image-preview` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification and clarified decisions in `specs/013-vehicle-image-preview/spec.md`.

## Summary

Add a non-blocking 2D vehicle image preview and saved garage image using the existing make (`Vehicle name`), model, and year fields. The backend searches Wikimedia Commons, conservatively accepts results with make/model, car-category, and license evidence, and persists a Commons reference and attribution with the vehicle. Owners may explicitly upload a JPEG/PNG/WebP photo up to 5 MiB; the authenticated owner photo is stored privately and remains authoritative until explicitly discarded. The browser keeps transient lookup state in the vehicle form and saved image data travels through the existing vehicle API and Redux garage state. Missing, ambiguous, invalid, or unavailable results use a local generic fallback and never block vehicle management.

## Technical Context

**Language/Version**: Python 3.11–3.13 (backend setup guide); TypeScript 5.9.3, React 19.3.0, Next.js 16.3.7.

**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, httpx 0.28.1; Redux Toolkit 2.13.0 and Material UI 9.4.0.

**Storage**: Existing SQLite local/test database and SQLAlchemy `vehicles` table; add nullable Commons metadata and deferred owner-upload BLOB/MIME fields through Alembic migrations.

**Testing**: Backend pytest; frontend Playwright E2E and the existing TypeScript type-check script. Add provider unit tests, API/migration coverage, and vehicle-form/garage E2E coverage. Tests are planned here and are not run as part of this plan.

**Target Platform**: Existing Next.js browser app and FastAPI backend; Wikimedia Commons Action API and Commons-hosted image URL are external dependencies.

**Project Type**: Web application with Python API and TypeScript frontend.

**Performance Goals**: Debounce lookup while typing; use a short bounded outbound timeout; return a fallback response on provider errors; avoid repeated external requests using bounded metadata caching and a descriptive User-Agent. Establish concrete latency budget during implementation; do not hold vehicle saves open for long provider retries.

**Constraints**: No paid subscription requirement; evaluate each Commons file's license and any other restrictions; attribute each Commons image; no API key or provider call from browser code; do not download or proxy Commons files. Explicit owner uploads are stored privately, served only to the owner, and have no Commons attribution. No changes to route planning or vehicle range. Commons asks API clients to identify themselves, use considerate request rates, cache reusable responses, and respect rate-limit responses.

**Scale/Scope**: One optional image association per owned vehicle; no bulk import, multi-provider abstraction, AI generation, 3D, VIN, or registration data.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Modular boundaries and ownership — PASS.** Backend owns provider requests, matching, license validation, and persistence. Frontend owns form preview, fallback display, and interaction state.
- **II. Compatible frontend — PASS.** Use existing TypeScript, Redux Toolkit, MUI, and supported Next.js patterns; no new dependency is currently required.
- **III. Shared state — PASS.** Lookup state is transient to `VehicleForm`; saved vehicle/image state is returned by the API and held in the existing vehicles Redux slice.
- **IV. Contracts and access — PASS.** Extend typed Pydantic/OpenAPI and TypeScript contracts additively, retain the `data`/safe `error` envelopes, authenticate image lookup, and reuse owner-scoped vehicle mutations.
- **V. Verified accessible outcomes — PASS.** Plan backend provider/API/migration tests and frontend preview, fallback, keyboard, alt-text, attribution, and reload coverage. Failures must not expose provider internals or block saving.
- **VI. Travel assistance boundaries — PASS.** No travel assistant, route, or autonomy behavior changes.

**Post-design re-check**: PASS. The proposed persistence is additive and nullable for existing vehicle rows; image service errors are isolated from vehicle validation and database save behavior. No constitution exception is required.

## Design and Implementation Approach

1. Add a backend Commons client/service that searches only file namespace results, requests image URL plus filtered `extmetadata`, and normalizes the fields needed for attribution. Accept a result only when title/description/category metadata supports the entered make and model plus either the exact year or an explicit production-year span containing it. Prefer exact-year evidence; if multiple results remain equally supported or metadata is incomplete, return fallback. Reject disallowed/malformed license metadata and URLs outside the expected HTTPS Commons hosts.
2. Add an authenticated vehicle image-preview endpoint before the existing dynamic `/{vehicle_id}` route. It returns a typed match or generic-fallback result using the standard success envelope. Search failures are represented as fallback outcomes, not application errors. Debounce lookup in the form and ignore stale responses when fields change.
3. Add nullable Commons association and attribution fields to `vehicles` in a forward-only additive Alembic migration. Existing rows remain valid and render the generic fallback. Keep the canonical file title and file-description page as the source reference; return provider metadata from vehicle reads.
4. Extend create/patch requests with an optional selected Commons file title. The backend verifies it is among the current make/model/year search candidates and resolves provider metadata before associating it; it never accepts arbitrary image or license URLs from the browser. On provider failure during save, create succeeds with no association; an edit with unchanged make/model/year retains the current association, while a changed image query clears it to fallback. Other vehicle updates preserve it.
5. Update `VehicleForm` to preview a match or clearly generic fallback and show required image attribution. Update garage cards to display the saved image with meaningful alt text and attribution; handle broken remote image loads by switching to the local fallback. Keep saved data in the existing vehicle Redux slice; keep lookup state local to the form.
6. Cover the feature with provider, mutation, contract, migration, and E2E tests described in [quickstart.md](quickstart.md). Do not alter route or range code.

The selected image URL remains hosted by Commons and is loaded by the browser; no image proxy or local binary cache is planned. Commons notes that hotlinking is possible but not recommended, so URL stability and remote availability are explicit risks. Any proposal to copy, proxy, or cache image bytes requires revisiting the retention/license decision before implementation.

## Project Structure

### Documentation (this feature)

```text
specs/013-vehicle-image-preview/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── vehicle-image-api.md
```

### Source Code (repository root)

```text
backend/
├── src/vehicles/
│   ├── routes.py                 # authenticated preview endpoint and vehicle mutation contract
│   ├── schemas.py                # preview/image response and optional selection input
│   ├── service.py                # keep ownership and image-association lifecycle consistent
│   └── image_provider.py         # proposed Commons HTTP client, parser, and conservative matcher
├── src/data/models/vehicle.py    # nullable image metadata on owned vehicle
├── migrations/versions/0006_vehicle_image_preview.py
└── tests/                        # provider, API, persistence, fallback, and migration coverage

frontend/
├── public/images/generic-vehicle.svg # local, model-neutral 2D fallback
└── src/features/vehicles/
    ├── vehiclesApi.ts            # preview call and expanded vehicle types
    ├── vehiclesSlice.ts          # persisted vehicle image response state
    └── components/
        ├── VehicleForm.tsx       # debounced, stale-safe preview and attribution
        └── VehicleManagementPage.tsx # garage image, attribution, broken-image fallback
```

**Structure Decision**: Extend the existing vehicle feature across its established FastAPI/SQLAlchemy API and Next.js/Redux/MUI module boundaries. The provider client belongs in `backend/src/vehicles/`; it is not a separate service or frontend integration.

## Complexity Tracking

No constitution violations or additional project/dependency layers are proposed.
