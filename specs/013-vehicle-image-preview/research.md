# Research: Vehicle Image Preview

## Decisions

### 1. Use Wikimedia Commons as the initial no-subscription source

**Decision**: Call the Commons MediaWiki Action API from the backend. Use `action=query&list=search` constrained to the file namespace for candidate discovery, then `prop=imageinfo|categories` for the selected file's media URL, filtered `extmetadata`, and vehicle-category evidence.

**Rationale**: Commons is the selected subscription-free source and exposes file search and image metadata through documented APIs. Backend access provides a descriptive User-Agent, avoids client-side API coupling, and allows license checks before a result enters a vehicle response.

**Alternatives considered**:
- Commercial vehicle-photo API: rejected because the product requirement is no required subscription.
- Local curated catalog: no recurring subscription, but requires sourcing, reviewing, licensing, and maintaining images manually; coverage is limited for arbitrary user-entered models.
- Browser-to-Commons calls: rejected because the backend needs to normalize provider data, apply matching/license rules, and persist the association.

### 2. Prefer exact matches, then accept clearly labeled same-model images

**Decision**: Normalize common model spelling variants (including `Model3`/`Model 3` and Romanian BMW notation `Seria 4`/Commons `4 Series`), strip trim/generation details in parentheses to form a core model, and query both the fuller model and core model. Rank results with exact make/full-model/year evidence first, then year evidence, then full-model evidence. If an exact match is unavailable, accept an image whose metadata supports the same make and core model, even if year evidence is absent or identifies another year. Persist `match_kind` as `exact` or `similar`; the UI must label similar images clearly. Select the highest-ranked eligible Commons result deterministically, preserving Commons search order for ties. Reject a make-only match or a different core model.

**Rationale**: Commons search is full-text search, not a vehicle catalog with normalized make/model/year fields. Requiring year text as a hard condition produces generic fallbacks for common entries such as Tesla Model 3. A persisted similar label supports useful results without representing uncertain year/trim as exact.

**Verification detail**: Cover exact year, year range, missing/wrong year, compact/spaced model spelling, same-core-model ties, different-model rejection, missing metadata, and disallowed licenses. Year remains required for vehicle data entry; only image matching treats it as a preference.

### 3. Persist source references and owner uploads separately

**Decision**: Store the Commons file title, browser-loadable media URL, canonical file-description page URL, creator, license name, and license URL as nullable metadata on the existing `vehicles` record. Do not download, proxy, or persist Commons image bytes. A separate explicit user-upload path stores JPEG/PNG/WebP bytes up to 5 MiB in a deferred BLOB on the vehicle row; the private content endpoint requires authentication and ownership.

**Rationale**: There is at most one image per vehicle, so nullable columns on the current vehicle table avoid an unnecessary one-to-one table and join while preserving the existing owner authorization model. A metadata snapshot lets the UI provide attribution even if Commons is temporarily unavailable.

**Trade-off**: Commons says direct embedding is possible but not recommended; remote deletion, URL changes, or outages can break rendering. The UI's image error handler must switch to the generic local illustration. User uploaded images are private application data and are not attributed to Commons.

### 4. Filter for actual car evidence

**Decision**: Request Commons categories and inspect them together with title, object name, and description. Reject explicit toy, scale model, miniature, model kit, logo, badge, illustration, and rendering terms. Require positive automobile/body-style evidence; if the text/category metadata cannot establish a car, return fallback.

**Rationale**: Full text search can return toys or logos for a make/model query. The filter is deterministic and conservative, but it is not computer vision and cannot guarantee the pixels contain only a car.

### 5. Re-check provider data on association and degrade saves safely

**Decision**: The browser submits only a Commons file title selected from a backend preview response, never arbitrary URLs or license claims. The backend validates the title's namespace, verifies it is a candidate for the submitted make/model/year, resolves current file metadata, verifies allowed image MIME/HTTPS host and license fields, and compares the saved request's make/model/year with the current vehicle data before storing the association. If resolution fails, vehicle data still saves with fallback semantics.

**Edit lifecycle**:
- When name/model/year are unchanged and lookup is unavailable, keep the persisted association.
- When any lookup field changes, do not preserve an image for the old identity. Persist the newly validated selected image or clear the image association to fallback.
- Changes to unrelated fields preserve the current image.

**Rationale**: The browser is not trusted to author license metadata or media URLs. A file title is a narrow identifier that the backend resolves against the fixed Commons API host. This avoids arbitrary-URL fetching/SSRF and prevents client-supplied attribution from entering the database.

### 6. Make every external failure a fallback outcome

**Decision**: Set a short connection/read timeout, make no unbounded retry loop, handle no results, malformed metadata, HTTP/API errors, rate limiting, and broken image rendering as ordinary fallback states. Respect `Retry-After` on 429 for future requests; do not make the current vehicle save wait for a retry.

**Rationale**: Vehicle management must work independently of the external image source. Wikimedia recommends a descriptive User-Agent, considerate/sequential requests, caching reusable responses, and honoring rate limits.

### 7. Keep preview state transient and saved vehicle data shared

**Decision**: Keep debounced query/result/loading state within `VehicleForm`; use request cancellation or a monotonically increasing query key to ignore stale results. Persisted image data is included in `VehicleResponse` and follows existing API-to-Redux vehicle flows.

**Rationale**: Only the form consumes in-progress lookup state, while the garage and form edit state consume saved vehicles through Redux. This follows the constitution's shared-state ownership rule.

## External References

- [MediaWiki API:Search](https://www.mediawiki.org/wiki/API:Search) — file namespace search parameters.
- [MediaWiki API:Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo) — file URLs, thumbnail URLs, and `extmetadata` properties.
- [MediaWiki Extension:CommonsMetadata](https://www.mediawiki.org/wiki/Extension:CommonsMetadata) — `extmetadata` field source and format.
- [Commons:Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) — file-by-file license verification, attribution, license links, and other restrictions.
- [MediaWiki API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette/en) — descriptive User-Agent, considerate requests, and metadata caching.
- [Wikimedia APIs:Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) — concurrency guidance and respecting `Retry-After` on rate-limit responses.
