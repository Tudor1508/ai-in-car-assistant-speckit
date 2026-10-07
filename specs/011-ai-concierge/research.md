# Research: AI Travel Concierge

**Date**: 2026-10-06

## Decisions

### Use OpenAI when backend runtime configuration is present

**Decision**: Use the real OpenAI provider when `OPENAI_API_KEY` is present in the backend environment. `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. Do not require a company provider/budget approval gate or `DRIVE_WISE_AI_ENABLED` as an approval gate. Missing required configuration returns a safe unavailable state with no provider request and no canned answer. Never expose or log the API key value. The interface states that requests may incur charges to the company.

**Rationale**: The requested runtime behavior is direct submission through the authenticated FastAPI backend. The API key remains server-side, while auth and CSRF remain the access boundary. The UI can retain the draft when configuration is absent or OpenAI fails.

**Alternatives considered**:
- Require separate company provider and budget approval settings: rejected because the user explicitly removed that runtime gate.
- Return a canned response when OpenAI is unavailable: rejected because it would misrepresent provider behavior.

### Use the authenticated answer operation without an app-level consent flow

**Decision**: The user submits a question by activating Send. The frontend calls the existing authenticated `POST /assistant/messages` operation; the backend validates authentication, origin, CSRF, and request fields, then calls OpenAI when required backend configuration is present. Do not add a separate confirmation dialog, consent token, grant, endpoint, or database migration. Show a concise provider and possible-charge notice in the chat.

**Rationale**: The user explicitly requested a direct send experience and removal of application-level consent infrastructure. Existing authentication and CSRF protections remain the access boundary. Automated tests inject a fake provider; no development or test flow makes live AI API calls.

**Alternatives considered**:
- Add an app-level Yes/No modal and grant endpoint: rejected because the user asked to remove that flow.
- Treat a live API call as required to verify integration: rejected because live calls are prohibited without explicit approval for a manual test.

### Use on-device-only speech recognition; never silently fall back to remote

**Decision**: Use browser speech recognition only when the browser exposes a local-only processing mode and confirms that the selected language is available on-device. Force local processing before recognition begins. Never switch to remote recognition automatically. If local-only recognition or the language pack is unavailable, show a clear voice-unavailable status and leave text entry usable. Do not record audio blobs or add an external audio upload endpoint. Audio never leaves the device.

**Rationale**: The project has no speech-recognition dependency or endpoint. The current MediaRecorder flow does not transcribe audio and inserts a fixed placeholder. The Web Speech API has a `processLocally` option and local language-pack availability checks, but MDN marks the local-processing property experimental and advises checking browser compatibility; unsupported cases must therefore fail back to typed entry. Remote speech services are not transparent and are not approved.

**Alternatives considered**:
- Use a browser's default recognition mode: rejected because the default may process remotely and local processing is not guaranteed.
- Add a hosted speech provider now: rejected because no provider, data terms, or budget has been approved.
- Continue storing `MediaRecorder` audio while pretending it is a transcription: rejected because it does not meet the user flow and invites accidental retention or upload.

**References**: [MDN: SpeechRecognition.processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [MDN: Using the Web Speech API (on-device processing and language-pack availability)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [Chrome for Developers: On-device Web Speech API](https://developer.chrome.com/blog/new-in-chrome-139/).

### Use local speech synthesis only

**Decision**: Use an available local device speech voice for answer playback. Select only a voice that reports `localService` true and matches the answer language. If no suitable local voice or speech support exists, disable playback with a clear explanation while keeping the answer text visible. Stop playback when the user selects Stop or closes the chat.

**Rationale**: Some synthesis voices are remote and can add bandwidth or cost. The browser exposes whether a voice is local or remote, so the feature can avoid sending conversation content to an unapproved speech service.

**Alternatives considered**:
- Use the browser's default voice without checking its service: rejected because a remote service may be selected.
- Add a hosted text-to-speech provider: rejected because no provider or budget is approved.

**References**: [MDN: SpeechSynthesisVoice.localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [MDN: SpeechSynthesisVoice](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice).

### Preserve the existing page and keep chat state local

**Decision**: Add the assistant as an isolated client feature mounted at the existing trip-planning page boundary. Render its launcher and panel as fixed overlays so they do not participate in page layout. Keep open/closed state, draft, displayed messages, loading, recording, and playback in component-local state because no other feature consumes them. Do not add routes, alter navigation, restyle or move existing page sections, or persist chat messages.

**Rationale**: The feature is explicitly limited to the agent. The existing assistant is already mounted from the trip dashboard, and the project's Redux principle permits local state for transient component-only interaction state.

**Alternatives considered**:
- Move assistant conversation state into Redux: rejected because it has no cross-component consumers and would create shared state without benefit.
- Put the chat in the account layout or change navigation: rejected because that broadens scope beyond the user's page-local request.

### Keep playback and recognition progressive enhancements

**Decision**: Text chat remains usable if local recognition, a matching local speech voice, microphone permission, or audio hardware is unavailable. Voice and playback failures must not change page layout or block sending/reading text.

**Rationale**: This follows the project constitution's accessible fallback requirement and avoids making browser-specific audio capabilities a prerequisite for the assistant.

**Alternatives considered**:
- Require speech APIs for chat use: rejected because browser support varies and text is the primary interaction.

## Existing Integration Findings

- `POST /assistant/messages` currently requires authentication and CSRF, accepts a trimmed 1–2,000 character question, optional `ro`/`en` locale, and invokes the provider.
- `backend/src/assistant/provider.py` currently sends the question and locale to the OpenAI Responses API with `store: false`; credentials alone enable the call.
- `frontend/src/lib/api/client.ts` centralizes credentialed JSON requests, CSRF bootstrap/refresh, and the shared `data`/`error` envelopes.
- `frontend/src/features/concierge/components/TravelConcierge.tsx` currently uses local component state and MUI. Its MediaRecorder does not transcribe audio; stopping inserts a hard-coded example question. Speech synthesis currently does not filter out remote voices.
- Existing backend tests inject fake providers through FastAPI dependency overrides, which can verify provider call counts and sensitive no-call cases without incurring live charges.
