# Vehicle Image API Contract (Plan)

This document records the planned additive contract. Final generated OpenAPI schemas remain authoritative during implementation.

## Authentication and envelopes

- All endpoints below require an authenticated account. The preview endpoint performs no mutation; create/patch continue to require the existing CSRF protection.
- Success uses the existing `{"data": ...}` envelope; failures use the existing safe `{"error": {"code", "message", ...}}` envelope.
- Commons lookup occurs server-side. The browser never calls Commons directly and never supplies arbitrary external URLs or license claims.

## Preview

`GET /vehicles/image-preview?name={make}&model={model}&year={year}`

Register this static route before the existing `/vehicles/{vehicle_id}` route so `image-preview` is not parsed as an ID.

Query fields use the same lengths/validation as existing vehicle fields (`name` and `model` 1–80 characters; year an allowed integer vehicle year). The backend trims and normalizes the search terms.

Matched response:

```json
{
  "data": {
    "status": "matched",
    "image": {
      "provider": "wikimedia_commons",
      "file_title": "File:Example vehicle.jpg",
      "image_url": "https://upload.wikimedia.org/...",
      "file_page_url": "https://commons.wikimedia.org/wiki/File:Example_vehicle.jpg",
      "creator": "Example photographer",
      "license_name": "CC BY-SA 4.0",
      "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
      "match_kind": "exact"
    }
  }
}
```

No confident result, unsupported license, malformed provider metadata, timeout, rate limit, or provider outage returns HTTP success with:

```json
{"data": {"status": "fallback", "image": null}}
```

The UI may show a brief non-blocking lookup status, but a provider error is not a vehicle-form validation error. Do not pass raw provider error details to the client.

## Vehicle create and patch

- Add optional `image_file_title: string | null` to `VehicleCreate` and `VehiclePatch`. The client may send only the Commons file title returned by preview. No image URL, creator, or license fields are accepted from clients.
- On create, absent/null or invalid/unavailable image resolution results in a valid vehicle with `image: null`.
- On patch, omission means preserve image if `(name, model, year)` did not change. If those fields changed, resolve the supplied title; on absent/null or failed resolution clear the old Commons association and return `image: null`. Changes to other fields preserve the existing association.
- `discard_uploaded_image: true` explicitly removes an existing user upload and permits the supplied Commons file title to be resolved. Without this flag, an uploaded photo remains authoritative even when identity fields change or an image title is submitted.
- Before association, verify the supplied file title is in the current Commons candidate results for that vehicle identity; re-fetch its metadata and license from Commons. If the provider is unavailable during this check, continue the vehicle mutation with the fallback lifecycle above.
- Provider resolution uses a bounded timeout. Provider failures degrade to null image association and must not turn a valid vehicle mutation into a 5xx response.

## Vehicle response

Add `image: VehicleImageResponse | null` to `VehicleResponse`. The object fields match the preview image object. `image: null` indicates the generic fallback. `match_kind` is `exact` when metadata supports the entered full model and exact year/containing year span; otherwise, a usable same-core-model candidate is `similar`. Similar images are visibly labeled in both preview and garage card. Existing fields and success envelope remain unchanged. The additional response field and optional request fields are additive for existing clients.

An uploaded photo is represented as `{ "provider": "user_upload", "image_url": "/vehicles/{vehicle_id}/image-content", "match_kind": "uploaded" }`. The frontend loads that URL with the authenticated session.

## User photo upload/content

`POST /vehicles/{vehicle_id}/image` accepts raw request bytes with `Content-Type: image/jpeg`, `image/png`, or `image/webp`; maximum size is 5 MiB. It requires authentication, CSRF validation, and ownership of the vehicle. The backend checks the declared MIME against the file signature, stores the bytes and MIME with the vehicle, and clears Commons metadata. Success returns the standard vehicle envelope.

`GET /vehicles/{vehicle_id}/image-content` requires authentication and vehicle ownership and returns the stored image bytes with the verified MIME, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`. Missing photo returns 404. The endpoint never exposes another owner's image.

The form accepts an optional file during add/edit. It first saves vehicle fields, then uploads the photo; an upload error is shown without replacing an existing saved photo. Allowed files are JPEG, PNG, or WebP and no larger than 5 MiB. A user upload takes precedence over all Commons matches until the explicit discard patch succeeds.

## Error and security behavior

- Existing authentication, CSRF, ownership, and validation error codes remain unchanged.
- Reject unsupported MIME/signature with 415 and oversized uploads with 413 through the standard error envelope.
- Backend builds requests only against the fixed Commons API host; validate file namespace and allowed HTTPS media/license hosts before persistence.
- Strip/sanitize provider HTML metadata before using it in UI strings. Render attribution as escaped text and allowlisted links, never raw HTML.
- Respect Wikimedia API User-Agent and rate-limit guidance; honor `Retry-After`, bound concurrency, and cache reusable metadata with a limited TTL. Never expose backend configuration or internal provider errors.
- Request Commons categories along with image metadata. Require positive car/automobile evidence in title, description, or categories; reject metadata indicating toys, scale models, miniatures, kits, logos, drawings, or illustrations. Treat insufficient evidence as fallback; this is a conservative text/category check rather than image recognition.
