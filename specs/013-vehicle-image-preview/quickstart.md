# Quickstart and Verification: Vehicle Image Preview

## Existing Development Setup

Follow the repository setup guide. Backend dependencies already include FastAPI, httpx, SQLAlchemy, Alembic, and pytest. No API key or paid subscription is required. Apply local schema upgrades from the backend directory with `alembic upgrade head` after pulling this feature, then restart the backend.

## Planned Verification

Verification commands and user-photo scenarios for implementation/review.

### Backend

- Unit-test Commons request construction, bounded search results, User-Agent, image namespace/media host checks, metadata normalization, license/attribution extraction, candidate scoring, ambiguous/no-year fallback, malformed metadata, timeout, HTTP errors, and 429 behavior.
- Test preview endpoint authentication, query validation, success envelope, matched response, generic response on no match/provider failure, and absence of provider/internal error detail.
- Test vehicle create and patch: valid selection persists; forged/arbitrary URLs are rejected or ignored safely; provider failure never blocks fields; unchanged identity preserves association; changed identity with no valid match clears association; unrelated field update preserves association; foreign owner cannot read/change another vehicle's image.
- Test Alembic upgrade from current head for existing rows, defaults/nullability, and downgrade behavior.
- Test Commons car evidence filtering, including rejection of toys, scale models, miniatures, logos, illustrations, and results with insufficient vehicle metadata.
- Test user upload limits and MIME/signature checks, ownership, private/no-store image reads, saved-photo persistence, retention through identity changes, and explicit discard.

### Frontend

- Test supported query preview and attribution, generic fallback for no match, malformed/unlicensed result, timeout and image `onError`.
- Simulate out-of-order responses after make/model/year edits and verify stale results cannot replace the latest preview.
- Test save while preview is pending/unavailable, save with matched title, unchanged-identity edit retaining its existing image when preview fails, and changed-identity edit displaying fallback.
- Verify garage card image, creator/license link, meaningful alt text, responsive layout, keyboard use, and persisted display after garage reload.
- Run the existing frontend `type-check` and Playwright E2E suite as the implementation review requires.
- Test JPEG/PNG/WebP selection, immediate form preview, garage display/reload, Commons suppression while a saved upload is active, and discard returning to Commons/fallback behavior.

## Manual Acceptance Walkthrough

1. Add a common make/model/year with a Commons result whose description establishes the identity and whose license is usable; confirm preview and attribution appear before save.
2. Save and reload the garage; confirm the image and attribution still appear without another lookup.
3. Change the identity to an ambiguous or unsupported vehicle; confirm generic fallback and successful save.
4. Simulate timeout/rate limit and a broken Commons media URL; confirm save continues and the local generic fallback appears.
5. Edit an unrelated field during a provider outage and confirm the saved image remains; change make/model/year during the outage and confirm the old identity's image is not shown.
6. Choose “Not your car in the image? Upload a photo”, save a JPEG/PNG/WebP up to 5 MiB, reload the garage, and confirm the owner photo is displayed.
7. Change the make/model/year while an owner photo is saved; confirm it stays until “Discard uploaded photo” is explicitly selected and saved.
8. Confirm Commons candidates lacking positive car evidence or marked as toys, miniatures, kits, logos, or illustrations use the generic fallback. Metadata filters reduce false positives but do not visually inspect the image pixels.
