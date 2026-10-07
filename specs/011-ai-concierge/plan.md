# Implementation Plan: AI Travel Concierge

**Branch**: `011-ai-concierge` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: [Feature specification](spec.md), project constitution, current assistant route/provider/client, and existing account/session/API patterns.

## Summary

Add an isolated floating concierge to the existing trip-planning page without changing its layout or other controls. When the user activates Send, the frontend calls the authenticated FastAPI message endpoint, which calls the real OpenAI provider when required backend configuration is present. Do not show an app-level consent dialog, issue a consent token/grant, or add a consent endpoint or consent database migration. Keep a persistent notice stating clearly that chatbot requests may incur charges to the company. Keep the provider API key in the backend environment only; never return, log, or expose its value. Use only on-device speech recognition when the browser guarantees local processing, and only local synthesis voices; keep typed chat and readable answers usable when voice capabilities are absent. Do not persist messages, transcripts, audio, or answers.

## Technical Context

**Language/Version**: Python 3.11–3.13; TypeScript 5.9.3; Node.js 20.9+; React 19.3.0.

**Primary Dependencies**: Existing FastAPI 0.115.6, Pydantic 2.13.5, SQLAlchemy 2.0.54, Alembic 1.20.0, httpx 0.28.1, Next.js 16.3.7, React 19.3.0, Redux Toolkit 2.13.0, and MUI 9.4.0. Use browser speech APIs only; add no package dependency.

**Storage**: No new persistence or migrations. SQLite remains local-development and isolated-test storage only. No consent grants, chat, audio, transcript, or answer history.

**Testing**: Backend `python -m pytest` with a fake provider for deterministic auth, validation, missing-configuration, and safe-error tests; include a local frontend-to-FastAPI integration test against an isolated backend with an injected fake provider. Frontend `npm run type-check`, `npm run build`, and Playwright coverage use fake-provider or intercepted local test services only. Do not make live provider requests during specification, planning, implementation, or automated tests. Test user-visible possible-charge notices and zero provider calls while required configuration is absent.

**Target Platform**: Existing responsive browser application. Browser-only audio capabilities are progressive enhancements; support the UI when local speech APIs are unavailable. The Web Speech API on-device mode is experimental and must be feature-detected at runtime.

**Project Type**: Existing Next.js App Router frontend plus FastAPI backend.

**Performance Goals**: Keep panel interactions local and immediate; no new latency target for an external answer. Existing provider timeout behavior remains bounded. Local voice startup must not block text entry or page interaction.

**Constraints**: No application changes outside the concierge and its necessary page mount/API boundary. No package, lockfile, or constitution changes. Keep the provider API key backend-only. Codex MUST NOT inspect or retrieve the API key value; implementation MUST NOT log, return, or expose it. Do not add a company provider/budget approval gate or an in-app confirmation dialog. Never claim an API request is free. No consent token/grant, consent endpoint, consent table, or consent migration. No live AI API calls during specification, planning, implementation, or automated tests; use a fake provider in tests. Before any live AI API call by Codex during implementation or manual testing, stop and ask the user for explicit approval, stating the provider, exact data to be sent, and possible charges; wait for the user's answer. No voice-recognition remote fallback or audio upload. Only locally supplied speech voices may be used. Preserve existing trip content, layout, navigation, controls, and behavior. Production hosting and database remain open project decisions; SQLite is not a production choice.

**Scale/Scope**: One fixed launcher and one responsive floating panel on the authenticated trip-planning page; the existing answer operation and safe provider-status operation only; no consent operation, consent persistence, new pages, navigation items, dependencies, account-history features, external audio endpoints, or production service.

## Constitution Check

*GATE: Evaluated before Phase 0 research and again after Phase 1 design.*

| Principle | Plan check | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | The frontend owns the overlay, draft, local messages, provider notice, and local speech controls. The backend owns account/session checks and the provider call. UI/API ownership is defined in the contracts. | PASS |
| II. Compatible, Reusable Frontend | Reuse declared React, TypeScript, MUI, and project conventions. Add no packages. Keep concierge responsibilities in the existing feature module. | PASS |
| III. One Authority for Shared Client State | Concierge interaction is confined to one widget and has no cross-component consumers; local component state is the sole owner. No Redux duplicate is introduced. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | Define status, answer, and safe error envelopes. Require active account and CSRF for message requests. Require backend OpenAI configuration for provider calls. | PASS |
| V. Verified, Accessible User Outcomes | Quickstart and tests cover authorization, no-call gate, provider failures, local-only voice behavior, narrow layout, keyboard/accessibility, and unchanged page regression. | PASS |
| VI. Bounded, Transparent Travel Assistance | Retain travel scope and uncertainty labels. Send the new question, locale, and bounded recent chat history only. Keep provider credentials backend-only and never upload audio. Preserve typed interaction on voice failure. | PASS |
| SDD development and review | Spec requirements trace into model, UI/API contracts, quickstart, and subsequent tasks. | PASS |

No constitution violations or exceptions are proposed. The backend reports unavailability if required OpenAI configuration is absent.

## Design Decisions

- Add `GET /assistant/status` to return safe provider availability and display metadata. It returns unavailable when required OpenAI configuration is missing.
- Keep `POST /assistant/messages` as the authenticated, CSRF-protected request used when the user activates Send. Remove the old client boolean and accept only `question` and `locale`; do not add a consent endpoint or token/grant flow.
- Use the real OpenAI provider when `OPENAI_API_KEY` is configured in the backend environment; `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. No separate company approval settings or `DRIVE_WISE_AI_ENABLED` approval gate is required. The UI states that chatbot requests may incur charges to the company and never describes API requests as free.
- Missing required OpenAI configuration fails closed with an honest unavailable response. Keep the API key backend-only, and never inspect, print, log, return, or expose its value.
- Use browser on-device speech recognition only when `processLocally` is supported and the requested locale is confirmed locally available. Do not enable the `MediaRecorder` placeholder flow, add an audio upload endpoint, install a language pack automatically, or fall back to a remote speech service. When local recognition is unavailable, show the mic as unavailable and preserve text entry. Audio never leaves the device.
- Use speech synthesis only with a supported local voice matching response language. If no local voice is available, retain readable answers and report playback unavailable.
- Mount the assistant in the existing trip dashboard using isolated fixed-position elements. Keep widget state in component-local state and retain displayed messages only in page memory. Preserve the existing “N” emblem and position the launcher opposite it at bottom-right.
- Preserve the `/assistant/messages` route and response envelope, but intentionally change its request schema. The only known caller in the repository is the first-party concierge UI; update it atomically. Legacy boolean-only requests must fail before provider invocation. Confirm there are no other in-repository callers before merge and review the incompatibility explicitly.

## Project Structure

### Documentation (this feature)

```text
specs/011-ai-concierge/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── assistant-api.md
│   └── concierge-ui.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.py                                  # Existing app/router registration only if needed
│   ├── assistant/
│   │   ├── routes.py                            # Status and answer operations
│   │   ├── schemas.py                           # Validated status/message contracts
│   │   └── provider.py                          # OpenAI configuration check and adapter
│   ├── auth/dependencies.py                     # Reuse account/session/CSRF dependencies
│   └── api/errors.py                            # Safe assistant errors
└── tests/
    ├── test_assistant_api.py                    # Auth, validation, fake-provider and no-call gates
    ├── test_assistant_provider.py               # Configuration and safe failures
    └── test_schema_evolution.py                 # Migration compatibility where applicable

frontend/
├── src/
│   ├── app/(account)/trip/page.tsx              # Existing page entry; no navigation/page redesign
│   ├── features/trips/components/
│   │   └── TripPlanningDashboard.tsx            # Existing assistant mount, limited integration
│   ├── features/concierge/
│   │   ├── assistantApi.ts                      # Status and message contracts
│   │   └── components/TravelConcierge.tsx       # Isolated floating panel and local voice controls
│   └── lib/api/client.ts                        # Reuse unchanged shared API conventions
└── tests/
    └── concierge.spec.ts                        # Overlay, Send, local-only voice, regression
```

**Structure Decision**: Extend the existing two-project web app and existing assistant feature module. Backend work stays in `src/assistant`; frontend work stays in `features/concierge` with only the existing dashboard mount as its integration point. No new model or migration is needed. Existing trips, auth, vehicles, navigation, and shared API client behavior are not redesigned.

## Post-Design Constitution Check

| Principle | Design evidence | Result |
|---|---|---|
| I. Modular Boundaries and Ownership | [assistant-api.md](contracts/assistant-api.md) assigns authentication, provider gating, and provider calls to the backend; [concierge-ui.md](contracts/concierge-ui.md) assigns overlay and local interaction to the widget. | PASS |
| II. Compatible, Reusable Frontend | UI contract uses existing React/MUI patterns and browser feature detection; no package changes. | PASS |
| III. One Authority for Shared Client State | Transient widget-only state has one component-local owner and is not duplicated in Redux. | PASS |
| IV. Explicit Contracts and Backend-Enforced Access | API contract defines `data`/`error` envelopes, authentication, CSRF, backend configuration checks, and safe errors. | PASS |
| V. Verified, Accessible User Outcomes | [quickstart.md](quickstart.md) covers fake-provider tests, missing configuration, voice fallback, accessibility, responsive, and non-regression scenarios. | PASS |
| VI. Bounded, Transparent Travel Assistance | Local-only audio, backend-only credentials, travel scope, approximate estimates, and text fallback are explicit. | PASS |
| SDD development and review | Artifacts map FR/SC requirements to contracts, data lifecycle, validation steps, and later tasks. | PASS |

No post-design gate violations or exceptions are proposed. Production database and deployment remain outside this feature's local-development scope; resolve them before production deployment as required by the constitution.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Provider status operation beside the current answer route | The UI must know whether required backend OpenAI configuration is present before presenting Send as available. | Exposing provider credentials or returning a canned fallback would be unsafe and misleading. |
