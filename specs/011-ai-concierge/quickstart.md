# Quickstart: AI Travel Concierge

This guide defines how to validate the concierge after implementation. Automated tests MUST use a fake provider and MUST NOT make live AI API calls. Before any live AI API call by Codex during implementation or manual testing, stop and ask the user for explicit approval, state the provider, exact data to be sent, and possible charges, then wait for the user's answer. Do not inspect, print, log, or expose the API key value.

## Runtime configuration

- Keep `OPENAI_API_KEY` only in the backend environment, such as the ignored `backend/.env`; never place it in frontend configuration, committed files, logs, or responses.
- `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`.
- No `DRIVE_WISE_AI_ENABLED` feature switch or company provider/budget approval setting is required. If required OpenAI configuration is absent, status and message requests report an honest unavailable error and do not return a fake/canned answer.
- Direct chatbot requests may incur charges to the company. The UI must display this notice and must not claim requests are free.
- Do not make a live request as part of implementation, CI, or automated tests. A live manual test requires the user's explicit prior approval with provider, exact payload, and possible charges disclosed.

## Validation scenarios

### 1. Authenticated question submission with a fake provider

1. Inject a fake provider in backend tests and use the ordinary account and CSRF flow.
2. Request assistant status and confirm it returns safe metadata only; it must not contain credentials or their values.
3. Confirm the UI displays a persistent notice that chatbot requests may incur company charges and has no confirmation dialog.
4. Activate Send; verify the authenticated frontend calls `POST /assistant/messages` once with only the exact question and locale.
5. Verify the fake provider receives the new question, locale, and bounded chronological user/assistant history, with no credentials, account details, trip records, or audio.
6. Submit unauthenticated, invalid-CSRF, blank, unsupported-locale, and over-length requests; assert rejection before the fake provider is called.
7. Simulate missing OpenAI configuration and provider failure; verify an honest unavailable/error message, no canned response, retained draft, and no automatic retry.
8. Run the local frontend-to-FastAPI integration scenario against an isolated backend with an injected fake provider. Send a route question followed by a general reference such as “What stop would work along it?”; verify the second request contains the earlier user and assistant messages in order and the fake uses them to answer. Confirm no live provider is contacted.

### 2. Local speech and text fallback

1. In a browser that reports on-device recognition and a local language pack, dictate a question and stop recognition.
2. Assert visible recording state, editable transcription, and no automatic send. Inspect network activity and verify there is no audio request or audio payload.
3. Change the transcription and activate Send; assert only the reviewed text is submitted and no confirmation dialog appears.
4. In a browser without enforced local recognition, without a local language pack, or with microphone permission denied, assert a clear voice-unavailable/error state and usable typed input.
5. Verify recognition never switches to remote mode and no language pack is automatically installed by the application.

### 3. Local speech playback

1. With a matching local speech voice, play an assistant answer and stop it before completion; verify the text remains visible.
2. With no local voice, a remote-only voice, unsupported speech API, or a synthesis error, verify playback is unavailable and the written response remains readable.
3. Close the chat during playback and verify speech stops.

### 4. Launcher, responsive panel, and page non-regression

1. Capture the authenticated trip-planning page before opening the assistant.
2. Verify the closed circular launcher is fixed bottom-right opposite the existing bottom-left “N” emblem.
3. Open the panel; verify the launcher disappears, the panel overlays without reflow, and existing page controls/navigation remain in place and functional.
4. Close with X; verify playback/recognition stops and the launcher returns to its original position.
5. Repeat at a narrow viewport. Verify the panel fits within safe viewport margins and all message/input/control areas remain usable.
6. Check keyboard focus, accessible names, and live status/error announcements.

## Commands after implementation

Backend focused tests (fake provider only):

```powershell
cd backend
python -m pytest tests/test_assistant_api.py tests/test_assistant_provider.py
```

Frontend type check and build:

```powershell
cd frontend
npm run type-check
npm run build
```

The existing Playwright configuration requires the documented local backend/frontend host, port, API base URL, and base URL settings. Run concierge browser scenarios against an isolated backend with an injected fake provider; do not use live credentials or call OpenAI.

## Expected result

Automated provider tests use a fake provider and make zero live AI API calls. At runtime, Send calls OpenAI through the authenticated FastAPI backend when required backend configuration is present. The API key stays backend-only. Missing configuration or provider failures produce honest errors, never canned answers. Audio never leaves the browser. Opening or closing the panel leaves the existing trip-planning page unchanged.
