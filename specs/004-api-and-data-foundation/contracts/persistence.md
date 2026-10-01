# Persistence Contract

**Approval status**: Owner-approved 2026-10-01: local/test SQLite, SQLAlchemy 2.x, Alembic 1.x, and the configuration/default below. No production database is selected.

## Configuration

- Setting: `DRIVE_WISE_DATABASE_URL`.
- Default: credential-free SQLite file under a Git-ignored directory within `backend/`, resolved independently of the caller's working directory.
- No credential or remote service is required for the local foundation.
- Contributors and tests can override the URL; automated tests use an isolated temporary store and do not touch the default.

## Data-access boundary

Use SQLAlchemy 2.x with a shared configured engine and an explicit session/transaction boundary. Product-specific tables, models, and repository methods belong to their own feature specifications. This foundation introduces no product model or table and exposes only the reusable store/session setup needed by future features.

## Schema evolution

- Use Alembic 1.x for ordered revisions.
- An empty local store can be upgraded to the current foundation revision.
- Reapplying the upgrade to a current store leaves it at the same current revision without duplicate effects.
- The initial foundation revision creates no product table; migration metadata is infrastructure only.

## Verification

Automated checks use a new temporary local store, verify connectivity, write/read matching non-product fixture values, remove the fixture/store, and verify schema setup for both fresh and current states. Test data must not leak into a contributor's default local store.
