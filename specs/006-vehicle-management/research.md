# Research: Vehicle Management

**Status**: Planning decisions resolved from the approved project foundation and feature specification. No external research or new dependency is needed.

## Decision 1: Reuse the established two-layer web stack

- **Decision**: Use FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, Next.js 16.3.7, React 19.3.0, Redux Toolkit 2.13.0, MUI 9.4.0, and existing Playwright 1.56.1.
- **Rationale**: These are the approved and implemented choices in features 003–005, and directly support the needed HTTP contract, persistence, shared client state, accessible UI, and browser coverage.
- **Alternatives considered**: Add another API/data/UI framework or state library. Rejected because no need exists and the constitution requires compatibility and focused dependencies.

## Decision 2: Persist a vehicle with an account owner and enforce ownership on the server

- **Decision**: Add a `vehicles` table with an opaque string ID and a required foreign key to `accounts.id`. Add an Alembic revision after `0002_auth_accounts_sessions`. Create operations derive owner from the authenticated session. Every item read, update, and delete scopes by both record ID and current account ID. For absent and foreign-owned IDs return the same safe 404 response.
- **Rationale**: Matches the authentication feature's account identifier and backend authorization rules while preventing vehicle-ID enumeration and cross-account changes.
- **Alternatives considered**: Accept an owner ID from the request, or return 403 for foreign records. Rejected because caller-supplied ownership is unsafe and a distinct forbidden response discloses record existence. Client-only filtering is also rejected because it is not authorization.

## Decision 3: Use the existing API envelope and state-changing request protections

- **Decision**: Expose HTTP/JSON operations under `/vehicles`, use 004 `{ "data": ... }` success and common safe `{ "error": ... }` errors, and include request/response schemas in generated OpenAPI 3.1. All operations require an active session; POST/PATCH/DELETE also require existing CSRF and strict-origin protections. Preserve `/health` exactly.
- **Rationale**: Reuses the established client and backend middleware conventions and protects all garage data as account-owned data.
- **Alternatives considered**: New envelope, URL version, or separate auth mechanism. Rejected because these conflict with the approved API/data foundation or add no required capability.

## Decision 4: Define field validation and fuel applicability explicitly

- **Decision**: Trim required name and model (1–80 characters); type is exactly `combustion` or `electric`; year is an integer from 1886 to the current calendar year; range and mileage are nonnegative integer kilometers. Combustion requires `fuel_type` from `petrol`, `diesel`, `lpg`, `cng`, or `other`. Electric requires null fuel type and displays “Not applicable”. Reject unknown request fields and validate the merged record after PATCH.
- **Rationale**: The spec requires clear, testable validation and distinguishes the type-specific fuel rule. These bounded, common values fit the screenshot and requested vehicle attributes without adding unrelated product metrics.
- **Alternatives considered**: Arbitrary free-text fuel types, decimals, negative values, allowing fuel on electric vehicles, or adding battery-consumption fields. Rejected because they weaken consistent display and validation, or expand beyond requested data. No battery energy-consumption field is added.

## Decision 5: Keep the garage as an independently managed collection

- **Decision**: Vehicle deletion physically removes the vehicle row. Account deactivation continues to disable the account and revoke sessions; it does not delete vehicle rows, consistent with feature 005's policy that account deactivation does not cascade-delete product data. No vehicle limit is introduced. List order is stable by creation time then ID.
- **Rationale**: User-requested deletion is explicit, while preserving account deactivation behavior avoids data loss under an unrelated operation. Stable ordering keeps the UI predictable without adding sorting controls.
- **Alternatives considered**: Soft deletion and a product-level maximum. Rejected because neither is required by the spec.

## Decision 6: Add shared navigation only for implemented authenticated destinations

- **Decision**: Use an authenticated App Router group layout and a reusable navigation component across `/profile` and `/vehicles`; mark the current destination visually and with `aria-current="page"`. Keep `/login` and `/register` outside it. Use the reference image's dark navy/cyan styling direction.
- **Rationale**: Provides a consistent nav without duplicating page chrome. Repository inspection found no trip-planning or trip-history route, and the spec explicitly says not to create destinations for pages outside the application.
- **Alternatives considered**: Add `Plan a trip` and `Trip history` links based on screenshot labels. Rejected because no corresponding pages exist and implementing them would exceed this feature's stated scope.

## Decision 7: Keep shared vehicle data in Redux and use existing verification tools

- **Decision**: Add a vehicle API module and Redux slice; keep edit forms, confirmation dialogs, and other transient interaction state local. Reuse pytest and the existing Playwright suite; add no test dependency.
- **Rationale**: Redux is the constitutionally designated single owner for shared client state, and the existing API client already handles cookies, envelopes, and CSRF.
- **Alternatives considered**: Competing local copies or a new query/state library. Rejected as redundant and inconsistent with the project rules.
