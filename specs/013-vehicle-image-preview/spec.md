# Feature Specification: Vehicle Image Preview

**Feature Branch**: `013-vehicle-image-preview`
**Created**: 2026-10-07
**Status**: Draft
**Input**: User description: “La adăugarea și editarea unei mașini, folosește valorile deja introduse în câmpurile Vehicle name (marcă), Model și Year pentru a găsi o imagine reprezentativă pentru acel model și an. Arată imaginea ca preview în formular și apoi pe cardul mașinii din garaj după salvare. Dacă nu găsești o imagine potrivită sau imaginea nu se poate încărca, formularul și salvarea mașinii trebuie să funcționeze în continuare și să apară o imagine generică de rezervă. Cerința este pentru imagini 2D, fără generare AI, modele 3D, VIN sau numere de înmatriculare. Nu schimba funcționalitatea rutelor ori autonomia mașinii.”

## Clarified Decisions

- **Image source and cost**: Use the Wikimedia Commons API as the initial image source; the feature must not require a paid subscription. Evaluate each image's own license and use only images whose terms permit the application's display and retention behavior. Preserve the creator, source file page, license name, and license URL, and show the required attribution with the image. If those terms cannot be verified or met, do not use that image.
- **Multiple matches and approximate matches**: Normalize common spelling differences such as `Model3` and `Model 3`. Prefer a result verified for the make, full model, and entered year (or a production span containing it). If none is available, accept a result for the same make and core model even when the year is absent or differs, and clearly label it as similar. Reject results that only match the make or a different core model. Pick the highest-ranked eligible Commons result deterministically; do not present a chooser.
- **Year behavior**: Year remains required for vehicle data and is a preference for ranking image results, not a hard requirement for displaying a same-model image. If the exact year is unavailable, show a same-model image as similar and retain its match classification after save.
- **Persistence**: Persist the association, its exact/similar classification, and attribution/license metadata with the vehicle so it remains available after navigation and reload. Store a source reference and metadata, not a copied image binary; retention and caching must follow the image's license and source terms.
- **Service unavailable**: A failed or timed-out lookup never blocks vehicle save. For a new vehicle, save with the generic fallback. For an edit with unchanged make/model/year, retain the existing association. If those lookup fields changed and no new match is available, use the generic fallback for the edited details rather than displaying a mismatched old image.
- **User photo precedence**: Users may upload a JPEG, PNG, or WebP photo up to 5 MiB. A saved user photo is authoritative and remains attached across edits and Commons lookup results until the user explicitly discards it. Uploads are private to the vehicle owner; images are stored with the vehicle and served through an authenticated endpoint.
- **Car-only source filtering**: Commons candidates must contain positive vehicle/photo evidence in their title, description, or categories and must not contain evidence of toys, scale models, miniatures, logos, illustrations, or similar non-car results. If metadata is insufficient, use the generic fallback; this metadata filter is conservative and does not claim computer-vision certainty.

## User Scenarios & Testing

### User Story 1 - Preview an image while adding a vehicle (Priority: P1)

As an authenticated user adding a vehicle, I want to see a representative image after entering its make, model, and year so I can recognize the vehicle before saving it.

**Why this priority**: The image preview is the primary new behavior and lets the user see whether the catalog found an appropriate vehicle image.

**Independent Test**: Enter a make, model, and year with a known catalog match; verify a representative 2D image appears in the form and is associated with those entered vehicle details.

**Acceptance Scenarios**:

1. **Given** the user enters a supported make, model, and year, **When** an exact or same-core-model Commons image is available, **Then** the form displays it before save and labels it as similar when the full model/year is not confirmed.
2. **Given** the entered details change before saving, **When** a new image lookup completes, **Then** the preview corresponds to the latest make, model, and year and does not show a stale result for previous values.
3. **Given** a matching image is displayed, **When** the user saves a valid vehicle, **Then** the vehicle is saved using the existing vehicle fields and the selected representative image remains associated with it.

---

### User Story 2 - See the vehicle image in the garage (Priority: P1)

As an authenticated user viewing my garage, I want each saved vehicle to display its associated representative image so I can recognize it in the list.

**Why this priority**: The preview should remain useful after the add/edit dialog closes and when the user returns to the garage later.

**Independent Test**: Save a vehicle with a matched image, reload the garage, and verify its card still displays the associated image and accessible alternative text.

**Acceptance Scenarios**:

1. **Given** a vehicle with a matched representative image is saved, **When** the garage is displayed or reloaded, **Then** its vehicle card displays the image associated with that vehicle.
2. **Given** the user edits a vehicle's make, model, or year, **When** an exact or similar image is found and the edit is saved, **Then** the garage card displays the updated associated image and preserves its exact/similar label.
3. **Given** a vehicle image is displayed, **When** assistive technology reads the vehicle card, **Then** the image has useful alternative text based on the vehicle details and does not rely on the image alone to identify the vehicle.

---

### User Story 3 - Continue when an image is unavailable (Priority: P1)

As a user managing a vehicle, I want vehicle creation and editing to work even when image lookup fails so the optional visual enhancement cannot block garage management.

**Why this priority**: Vehicle data entry must remain reliable regardless of catalog coverage, network availability, or image hosting.

**Independent Test**: Simulate no matching image, a lookup timeout, and a broken image resource; verify the generic fallback appears and valid vehicle changes can still be saved.

**Acceptance Scenarios**:

1. **Given** the image source has no suitable match, **When** the lookup completes, **Then** the form and saved garage card show a generic vehicle illustration clearly identified as generic.
2. **Given** the image lookup fails or times out, **When** the user saves valid vehicle details, **Then** saving succeeds and the generic illustration is used.
3. **Given** an image URL stops loading after a match was found, **When** the image fails to render, **Then** the interface switches to the generic illustration without breaking the form or garage card.
4. **Given** an existing vehicle is edited while image lookup is unavailable, **When** its make, model, and year are unchanged, **Then** its saved image association is retained; if any of those fields changed, **Then** the edited vehicle uses the generic fallback until a suitable new image is found.

### User Story 4 - Upload a photo of my own vehicle (Priority: P1)

As a vehicle owner, I want to upload a photo when the catalog image is not my car, and keep my photo until I explicitly discard it.

**Acceptance Scenarios**:

1. **Given** I choose a supported photo in the add/edit form, **When** it is selected, **Then** the form previews that photo and it takes precedence over Commons.
2. **Given** I save a vehicle with an uploaded photo, **When** I revisit or reload the garage, **Then** the authenticated owner sees the saved photo.
3. **Given** a vehicle already has my uploaded photo, **When** I change the make/model/year or Commons returns another candidate, **Then** my photo remains active until I explicitly discard it.
4. **Given** I explicitly discard my uploaded photo, **When** I save, **Then** a matching Commons image may be associated or the generic illustration is shown.
5. **Given** the selected file is not JPEG/PNG/WebP, exceeds 5 MiB, or upload fails, **When** I save, **Then** an understandable error appears and the existing saved photo is not replaced by a Commons result.

## Edge Cases

- Make, model, or year is empty or changes while an image lookup is in progress.
- The image service returns no result, several similarly named results, a result for a different or unspecified year, or a result whose core model cannot be established.
- The image service times out, is rate limited, is unavailable, or returns malformed metadata.
- The image resource returns an HTTP error or cannot be rendered by the browser.
- An edit changes the make, model, or year but the image lookup has not finished when Save is selected.
- A vehicle has a generic fallback image because it was created while image lookup was unavailable; a later garage visit may find a match.
- A vehicle image source requires attribution, restricts caching or redistribution, or does not permit the intended application use.
- The same make and model has several generations or body variants in the entered year, so a precise image match cannot be established.
- The form and garage card are viewed at narrow viewport widths or with keyboard navigation and assistive technology.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST use the existing `Vehicle name` value as the vehicle make, together with `Model` and `Year`, as the image lookup criteria.
- **FR-002**: The add and edit vehicle forms MUST display an exact or same-core-model preview before save; a non-exact result MUST be clearly labeled similar.
- **FR-003**: The system MUST associate a selected representative image with the saved vehicle so that the garage can display it after navigation or reload.
- **FR-004**: When vehicle make, model, or year changes, the image preview MUST correspond to the latest entered values; an outdated asynchronous lookup MUST NOT replace a newer preview.
- **FR-005**: A missing match, image service failure, timeout, or image-loading failure MUST NOT prevent valid vehicle creation or editing.
- **FR-006**: If no usable image for the same make and core model is available, the system MUST display a generic 2D vehicle illustration. An image without confirmed full-model/year evidence MUST be labeled similar and MUST NOT be described as the exact make/model/year.
- **FR-007**: Vehicle images MUST be displayed in the garage cards with accessible alternative text. A generic illustration MUST be described as generic rather than as an exact model image.
- **FR-008**: The system MUST search Wikimedia Commons initially, normalize common model spelling variants and localized aliases (including Romanian BMW `Seria 4` to Commons `4 Series`), rank exact make/full-model/year matches above same-core-model results, and use the best eligible result deterministically. Year MUST be a ranking preference for image lookup; a same-core-model result with missing or different year may be shown only as similar. Only results whose individual license and source terms permit the intended display and retention behavior may be used. Preserve creator, source file page, license name, license URL, and exact/similar classification; present required attribution. Reject results that match only the make or a different core model.
- **FR-009**: Any credential required to access an image provider MUST NOT be exposed in browser-delivered code or client-visible configuration.
- **FR-010**: The feature MUST use 2D images only. It MUST NOT generate images with AI, add 3D models, request VINs or license plates, or change route planning or vehicle range behavior.
- **FR-011**: Existing vehicle fields, ownership enforcement, create/edit validation, and garage behavior MUST continue to work when image functionality is unavailable.
- **FR-012**: Image loading and lookup errors MUST be handled with understandable non-blocking feedback or the generic fallback, without exposing provider credentials or internal error details.
- **FR-013**: Commons candidates MUST be supported by positive car/automobile evidence in metadata or categories and MUST be rejected when metadata indicates a toy, scale model, miniature, logo, illustration, or other non-car result; insufficient evidence MUST use fallback.
- **FR-014**: The add/edit form MUST allow owner photo uploads in JPEG, PNG, and WebP formats up to 5 MiB and preview the selected photo before save.
- **FR-015**: An uploaded photo MUST take precedence over Commons matches and remain attached through vehicle identity edits until the owner explicitly discards it.
- **FR-016**: Uploaded photos MUST be persisted and served only through authenticated, ownership-checked endpoints with private/no-store response caching; invalid or failed uploads MUST NOT replace an existing photo.

### Key Entities

- **Vehicle**: The existing account-owned vehicle with its existing make/name, model, and year fields; it also has an associated representative image or uses the generic fallback.
- **Vehicle Image Match**: A Wikimedia Commons 2D image result and its associated make/model/year match information, source reference, creator, license name, license URL, and any other required attribution metadata.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For supported make/model/year entries with a suitable source result, at least 90% of preview attempts display the matching representative image before the user saves.
- **SC-002**: A valid vehicle can be created or edited successfully in 100% of tested cases where image lookup times out, returns no match, or the image fails to load.
- **SC-003**: In 100% of tested garage reloads, a vehicle displays its saved associated image or the generic fallback.
- **SC-004**: 100% of displayed provider images retain all attribution and license information required for the intended use.
- **SC-005**: Image lookup and image-loading failures do not cause vehicle validation, ownership, or save operations to fail.

## Assumptions

- The existing `Vehicle name` field is the make/brand; no separate make field is required by this feature.
- Commons image search is based on make, model, and year already captured by the add/edit forms. No VIN or registration number is needed. An optional user-uploaded photo may show the owner's actual vehicle.
- Commons images are representative of a vehicle model/year, not photographs of the individual user's physical vehicle or its current condition.
- Image results may be unavailable for some makes, models, generations, and years; the generic fallback is an expected normal outcome.
- Wikimedia Commons is selected to avoid a required paid subscription. Coverage may be incomplete; license eligibility, attribution, source/API terms, and permitted caching/retention MUST be verified for each result and before implementation.
- Existing vehicle authentication, ownership, validation, and garage behavior remain governed by feature 006.
- Route planning, range estimates, and energy-stop behavior are outside this feature.
