# Tasks: AI Travel Concierge

**Input**: `specs/011-ai-concierge/` (specification, plan, API/UI contracts, data model, and quickstart)

**Tests**: Automated tests MUST use fake providers and MUST NOT make live AI API calls. Before any live AI API call by Codex during implementation or manual testing, stop and ask the user for explicit approval, state the provider, exact data to be sent, and possible charges, then wait for the user's answer.

## Phase 1: Setup

- [X] T001 Confirm the existing assistant route, shared API client, and concierge mount described by `specs/011-ai-concierge/research.md`.
- [X] T002 Keep implementation changes within the concierge and its necessary backend/API/page integration files; do not edit package files or `.specify/memory/constitution.md`.

## Phase 2: Foundational

- [X] T003 Add safe assistant provider-status response fields in `backend/src/assistant/schemas.py` and `backend/src/assistant/routes.py`.
- [X] T004 Implement the server-only OpenAI provider configuration check in `backend/src/assistant/provider.py`; missing required configuration must fail closed, and the API key value must never be printed, logged, returned, or exposed. Codex must not read, inspect, or retrieve the key value.
- [X] T005 Keep all provider operations behind the existing authenticated FastAPI route with current origin and CSRF protections in `backend/src/assistant/routes.py`.

## Phase 3: User Story 1 - Open and close floating assistant (P1)

**Goal**: Provide the responsive overlay while preserving the existing trip-planning page and the bottom-left “N” emblem.
**Independent test**: Open and close the chat at desktop and narrow viewports; the launcher toggles at bottom-right and existing page positions remain unchanged.

- [X] T006 [P] [US1] Implement fixed launcher, floating panel, close action, and responsive layout in `frontend/src/features/concierge/components/TravelConcierge.tsx`.
- [X] T007 [US1] Keep the concierge mount isolated at its existing integration point in `frontend/src/features/trips/components/TripPlanningDashboard.tsx`.

## Phase 4: User Story 2 - Send a written travel question (P1)

**Goal**: Send a question directly through the authenticated backend to the configured provider, with no app-level confirmation dialog, consent token, grant, consent endpoint, or consent migration.
**Independent test**: Send a new question and then a follow-up; the authenticated endpoint passes bounded chronological user/assistant history to a fake provider, while invalid roles, oversized history, authentication, CSRF, or missing OpenAI configuration cause zero provider calls.

- [X] T008 [P] [US2] Add fake-provider API tests for authenticated Send, question/locale validation, CSRF rejection, missing-configuration handling, and safe provider failure in `backend/tests/test_assistant_api.py`.
- [X] T009 [P] [US2] Add fake-transport provider adapter tests for minimal payload, language hint, travel-only instructions, and safe error handling in `backend/tests/test_assistant_provider.py`; never use live credentials or network access.
- [X] T010 [US2] Implement question/locale validation and safe status/message schemas in `backend/src/assistant/schemas.py`.
- [X] T011 [US2] Implement authenticated provider-status and direct answer operations in `backend/src/assistant/routes.py`, retaining existing route authentication and CSRF checks.
- [X] T012 [US2] Implement direct authenticated message submission, provider status, loading/error/retry handling, and a persistent notice that chatbot requests may incur charges to the company, without a dialog, in `frontend/src/features/concierge/assistantApi.ts` and `frontend/src/features/concierge/components/TravelConcierge.tsx`.
- [X] T013 [US2] Apply travel-only instructions and keep the provider API key server-side in `backend/src/assistant/provider.py`; forward the question, locale, and validated chronological history.
- [X] T014 [US2] Add a local frontend-to-FastAPI integration test using an isolated local backend and injected fake provider in `frontend/tests/concierge.integration.spec.ts`; verify one Send request, payload limited to question and locale, draft preservation after provider failure, and zero live AI API calls.

## Phase 5: User Story 3 - Dictate and review a question (P2)

**Goal**: Offer local-only speech recognition with editable transcription and clear permission/capability errors.
**Independent test**: Recognition works only in enforced on-device mode; audio is never uploaded, transcription is editable, and Send is required.

- [X] T015 [US3] Implement feature-detected on-device recognition, visible recording state, cleanup, and typed fallback in `frontend/src/features/concierge/components/TravelConcierge.tsx`.
- [X] T016 [US3] Cover edited transcription, no auto-submit, unsupported local recognition, and denied microphone permission with fake/browser-mocked tests in `frontend/tests/concierge.spec.ts`.

## Phase 6: User Story 4 - Listen to or stop an answer (P2)

**Goal**: Speak answers only through matching local voices, with a prompt stop and readable fallback.
**Independent test**: Playback can be started/stopped locally; absent local voices leave text visible and usable.

- [X] T017 [US4] Implement local-voice-only answer playback and stop-on-close behavior in `frontend/src/features/concierge/components/TravelConcierge.tsx`.
- [X] T018 [US4] Cover local playback, stop, and unavailable-voice fallback with mocked speech APIs in `frontend/tests/concierge.spec.ts`.

## Phase 7: Polish and cross-cutting concerns

- [X] T019 [P] Add overlay, no-confirmation-dialog, page non-regression, bottom-right “N”-opposite launcher, accessibility, and narrow-viewport coverage in `frontend/tests/concierge.spec.ts`.
- [ ] T020 Verify the feature against `specs/011-ai-concierge/quickstart.md` using fake providers only; do not make live AI API calls.

## Dependencies

- T003-T005 establish the API and provider boundary before answer integration.
- US1 is the visual MVP and can proceed in parallel with backend foundation work.
- US2 depends on the foundational API/provider work and the floating panel.
- T014 depends on T006-T013 and uses only an isolated local backend with an injected fake provider.
- US3 and US4 depend on the panel but not on each other.
- T020 follows feature implementation and test changes.

## Parallel opportunities

- T003-T005 touch separate backend concerns and can be split if interfaces are agreed first.
- T006 can proceed independently of backend work.
- T008 and T009 are separate fake-provider tests and can be authored in parallel.
- T015 and T017 touch the same widget and should be sequenced.

## Implementation strategy

Deliver the overlay first, then direct authenticated text submission and its local frontend-to-FastAPI integration test, then on-device voice input and local playback. The running app uses OpenAI when required backend configuration is present; automated tests use injected fake providers and mocked transports only. Never make live AI API calls during implementation or testing. Before any live AI API call by Codex during manual testing, stop and ask the user for explicit approval, state the provider, exact data to be sent, and possible charges, then wait for the user's answer.
