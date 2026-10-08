# Quickstart: Producer Dashboard

## Local database

From `backend/`, inspect the heads before migration, then apply the new merge revision:

```powershell
alembic heads
alembic upgrade head
```

The migration preserves existing rows. Existing vehicles remain unassociated (`brand = NULL`) until their owner edits them and enters a brand. Vehicle removals are archived after the migration; pre-migration physical deletions cannot be recovered.

## Run services

Use the repository's existing backend and frontend setup instructions and configured `NEXT_PUBLIC_API_BASE_URL`. Sign in with an active Producer account that has a brand configured.

## Validate

```powershell
# Backend, from backend/
python -m pytest tests/test_producer_dashboard.py tests/test_vehicle_brand_archive.py

# Frontend, from frontend/
npm run type-check
npx playwright test tests/producer-dashboard.spec.ts
```

Use the existing theme toggle on the Producer header to check both display modes. Confirm the preference persists between `/producer` and `/producer/profile`, and that saved trips alone contribute to totals.
