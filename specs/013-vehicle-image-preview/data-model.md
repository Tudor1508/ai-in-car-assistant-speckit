# Data Model: Vehicle Image Preview

## Existing Vehicle

`backend/src/data/models/vehicle.py` maps one owner-scoped `vehicles` row with `name`, `model`, `year`, and existing vehicle/range fields. `name` is the make/brand. The image remains an optional part of this row so list/read responses do not need a new join and ownership continues to be enforced by the existing vehicle query.

## Proposed Image Association

Image association fields were added after `0005_admin_dashboard`; `image_match_kind` is added by follow-up migration `0007_vehicle_image_match_kind` after `0006_vehicle_image_preview`:

| Field | Type/limit | Meaning |
|---|---|---|
| `image_provider` | nullable string, 32 | `wikimedia_commons` when a verified image exists; null means generic fallback |
| `image_file_title` | nullable string, 255 | Canonical Commons file title, including `File:` namespace |
| `image_url` | nullable string, 2048 | HTTPS Commons-hosted media/thumbnail URL used by the browser |
| `image_page_url` | nullable string, 2048 | Canonical Commons file-description page |
| `image_creator` | nullable string, 512 | Creator/author credit metadata |
| `image_license_name` | nullable string, 160 | Human-readable license label from Commons metadata |
| `image_license_url` | nullable string, 2048 | HTTPS link to the license text |
| `image_match_kind` | nullable string, 16 | `exact` for confirmed full model and year/span; `similar` when only make/core model is confirmed |
| `image_upload_data` | nullable binary | Owner-uploaded JPEG/PNG/WebP bytes, maximum 5 MiB; SQLAlchemy defers loading for normal garage responses |
| `image_upload_mime` | nullable string, 32 | Verified upload MIME type; present only with `image_provider = user_upload` |

Association invariants:

- All image metadata columns, including `image_match_kind`, are null together for fallback; a partial association is rejected/cleared by backend validation.
- A user upload is a separate complete image source: provider is `user_upload`, upload bytes and MIME are present, and all Commons attribution columns are null.
- A saved user upload is authoritative across vehicle identity edits and Commons lookup results until an explicit discard request. Uploading a replacement replaces it only after the new bytes pass validation and are saved.
- The uploaded photo is served by an authenticated owner-scoped endpoint with `private, no-store` caching. The frontend fetches it with the user's session; it does not expose a public storage URL.
- Commons candidates require positive car evidence in title/description/categories and are rejected for toy, model-kit, miniature, logo, illustration, and similar evidence. Missing evidence means fallback; this is a metadata filter, not image recognition.
- `image_match_kind` is `exact` only when full model and requested year (or a containing production span) are supported. A same-core-model result with missing/different year is persisted as `similar` and clearly labeled by the UI.
- A persisted association points only to a backend-verified Commons file title and a fixed, HTTPS upload host; clients cannot submit media, file-page, or license URLs.
- The selected image is tied to the current `(name, model, year)` identity. If that identity changes and a new verified image is not available, clear the association. A failed unrelated-field edit preserves it.
- Commons association stores no downloaded binary. User uploads are stored as bytes in the existing vehicle row. No VIN, plate number, new make field, or route/range data is added.
- Existing rows are migrated with null image fields; no backfill or external request is performed during migration.

## API Representation

Expose a nullable nested `image` value in `VehicleResponse`:

```json
{
  "provider": "wikimedia_commons",
  "file_title": "File:Example vehicle.jpg",
  "image_url": "https://upload.wikimedia.org/...",
  "file_page_url": "https://commons.wikimedia.org/wiki/File:Example_vehicle.jpg",
  "creator": "Example photographer",
  "license_name": "CC BY-SA 4.0",
  "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
  "match_kind": "similar"
}
```

`image: null` means the frontend displays the local generic fallback. The actual response remains wrapped in the project's `data` envelope.

For an uploaded photo the response is `{ "provider": "user_upload", "image_url": "/vehicles/{id}/image-content", "match_kind": "uploaded" }`; the URL is only readable by the authenticated owner.

## Lifecycle

1. Preview returns candidate metadata without changing a vehicle row.
2. Create or update accepts an optional selected Commons file title; backend resolves/checks current provider metadata before persistence. A separate authenticated upload operation persists owner photo bytes.
3. On resolution or license failure, save vehicle fields and apply fallback lifecycle rules.
4. List/read returns the persisted image snapshot without calling Commons, so garage rendering and attribution survive navigation and provider outages. User photo content is fetched separately through the owner-scoped endpoint.
5. Browser image `onError` changes the rendered state to the local fallback; it does not mutate the saved row automatically.
