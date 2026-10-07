# Feature Specification: AI Travel Concierge

**Feature Branch**: `011-ai-concierge`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Add a travel AI agent to Drive Wise, limited strictly to the agent and elements needed for it. Add a fixed circular launcher and compact responsive floating chat with text, voice transcription for review, spoken answers with playback controls, clear status and error states, and travel-only responses. Preserve the rest of the page, its appearance, components, navigation, and existing functionality."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open and close the floating assistant (Priority: P1)

As a signed-in traveler, I want to open a compact assistant from a corner button so I can ask for travel help without leaving or rearranging the trip-planning page.

**Why this priority**: The assistant must be reachable while the existing page remains intact and usable.

**Independent Test**: Open the trip-planning page, record its content and layout, open and close the assistant, and verify the page content and navigation remain unchanged.

**Acceptance Scenarios**:

1. **Given** the chat is closed, **When** the trip-planning page is displayed, **Then** a circular assistant button is fixed at the bottom-right corner, opposite the existing “N” emblem in the bottom-left, and the chat window is not visible.
2. **Given** the chat is closed, **When** the user activates the circular button, **Then** a compact floating chat window opens without replacing, moving, resizing, or reorganizing the page content, and the circular button is hidden.
3. **Given** the chat is open, **When** the user activates its X close control, **Then** the window closes and the circular button reappears at the same bottom-right position.
4. **Given** the chat is open on a small screen, **When** the user views or uses it, **Then** the window fits within the viewport with usable message, input, and control areas and does not cause the underlying page to reflow.

---

### User Story 2 - Ask a travel question in text (Priority: P1)

As a signed-in traveler, I want to send a written question and receive a relevant answer in the chat so I can get travel guidance while using the planner.

**Why this priority**: Text interaction is the baseline assistant capability and fallback for voice limitations.

**Independent Test**: Enter an in-scope travel question, send it, and verify the question and answer appear in distinct message bubbles with clear loading and failure states.

**Acceptance Scenarios**:

1. **Given** the chat is open and a non-empty question is entered, **When** the user activates Send, **Then** the question appears as a user message and the interface indicates that an answer is being prepared.
2. **Given** a valid answer is received, **When** the response is displayed, **Then** it appears in an assistant message bubble and the text remains readable in the conversation.
3. **Given** the input is blank or contains only whitespace, **When** the user attempts to send, **Then** no request is made and the user can continue editing.
4. **Given** the assistant service fails or is unavailable, **When** the user sends a question, **Then** a clear error is displayed and the question remains available to retry.
5. **Given** the required OpenAI configuration is present, **When** the user activates Send for the displayed non-empty question, **Then** the frontend calls the authenticated backend once and the backend sends that question to OpenAI, without an additional confirmation dialog.
6. **Given** a request fails, **When** the user retries, **Then** no automatic request is made and the user must activate Send again.
7. **Given** required OpenAI configuration is missing, **When** the user activates Send, **Then** no external AI request occurs, the draft remains available, and the interface explains that the assistant is unavailable.

---

### User Story 3 - Dictate and review a question (Priority: P2)

As a signed-in traveler, I want to dictate a question, see when recording is active, and review or edit its transcription before sending it.

**Why this priority**: Voice input is a requested convenience, but must preserve the user's control over the final submitted text.

**Independent Test**: Start recording, verify a recording state is visible, stop recording, inspect and edit the transcription, then send it through the ordinary text flow.

**Acceptance Scenarios**:

1. **Given** microphone access is available, **When** the user activates the microphone control, **Then** recording begins and the chat clearly indicates that recording is active.
2. **Given** recording is active, **When** the user stops it, **Then** recognized words are placed in the text field for review and are not submitted automatically.
3. **Given** recognized text is in the field, **When** the user edits it, **Then** the edited text is what is sent if the user later chooses Send.
4. **Given** the microphone is unavailable, permission is denied, or transcription fails, **When** the user tries voice input, **Then** a relevant error is shown and typed questions remain available.
5. **Given** the user closes the chat while recording, **When** the close action completes, **Then** recording stops and microphone access is released.

---

### User Story 4 - Listen to or stop an answer (Priority: P2)

As a signed-in traveler, I want to play an assistant response aloud and stop it at any time so I can listen while keeping the written answer available.

**Why this priority**: Spoken playback is an accessibility and convenience feature attached to the answer experience.

**Independent Test**: Receive an answer, start playback from its audio control, stop playback, and verify the text stays visible.

**Acceptance Scenarios**:

1. **Given** an assistant message is displayed, **When** the user activates its read-aloud control, **Then** the displayed answer is spoken and the control indicates that playback can be stopped.
2. **Given** playback is active, **When** the user activates Stop or closes the chat, **Then** playback stops promptly.
3. **Given** speech playback is unavailable or fails, **When** the user attempts playback, **Then** the text answer remains visible and usable.

### Edge Cases

- A question is empty, whitespace-only, or exceeds the supported length.
- The external assistant service is unconfigured, unavailable, times out, or returns no usable answer.
- The user edits a question after a failed request or submits a duplicate question.
- Required OpenAI runtime configuration is missing or OpenAI is unavailable.
- On-device speech recognition is unavailable or the browser attempts to use a remote recognition service.
- The user closes the window during recording, while a request is loading, or during audio playback.
- Microphone permission is denied, the microphone is absent, or the browser cannot transcribe speech.
- Speech recognition returns an empty or inaccurate transcription.
- Speech playback is unsupported or cannot produce speech in the answer's language.
- The user has a narrow viewport, uses keyboard navigation, or uses assistive technology.
- The user session expires while the chat is open or a message is being sent.
- A question concerns a subject outside the assistant's stated travel scope.
- The assistant is asked about current availability, prices, opening hours, traffic, bookings, or route conditions that it cannot verify.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The assistant MUST be available from the trip-planning page to a signed-in user and MUST use the existing authenticated application access rules when sending a question.
- **FR-002**: When the chat is closed, the page MUST show a circular assistant launcher fixed at the bottom-right, opposite the existing “N” emblem in the bottom-left. When the chat is open, that launcher MUST be hidden. Closing the chat with X MUST restore the launcher to the same position.
- **FR-003**: Activating the launcher MUST open a compact floating chat window. The window MUST overlay the page without replacing or reorganizing page content or changing the existing page layout, components, navigation, or behavior.
- **FR-004**: The chat window MUST use a dark navy background, a turquoise outline, the title “Drivewise Assistant,” distinct message bubbles, a close control, a text field, Send, microphone, and answer audio controls.
- **FR-005**: The chat window MUST adapt to small screens so its messages, text entry, and controls remain visible and usable within the viewport.
- **FR-006**: The user MUST be able to enter and send a non-empty written question. The assistant MUST show the submitted question and answer as separate messages and MUST show a loading state while an answer is pending.
- **FR-007**: The assistant MUST accept questions about destinations and cities, tourist attractions, routes, approximate distance and duration, itineraries, accommodation, restaurants, parking, stations, and stops. It MUST politely redirect questions outside these topics.
- **FR-008**: The assistant MUST respond in the language used by the user, ask for essential missing details, and label distance or duration estimates as approximate.
- **FR-009**: The assistant MUST distinguish suggestions from verified facts and MUST NOT state unverified prices, opening hours, availability, traffic, bookings, transit times, or route conditions as confirmed.
- **FR-010**: The interface MUST NOT show an app-level confirmation dialog or consent step before sending a question. When the user activates Send, the frontend MUST call the authenticated FastAPI backend, which sends that question to OpenAI when the required backend configuration is present. A persistent notice MUST identify the provider and state clearly that chatbot requests may incur charges to the company; it MUST NOT claim requests are free.
- **FR-011**: The assistant endpoint MUST retain the application's existing authentication, origin, and CSRF protections. No consent token, grant, or consent endpoint is required. The backend MUST reject unauthenticated or CSRF-invalid requests before provider invocation.
- **FR-012**: Each Send request MUST include the new question, locale, and up to 10 recent user/assistant messages from the current chat, in chronological order. The combined question and history MUST not exceed 8,000 characters, and each history message MUST not exceed 4,000 characters. The backend MUST accept only `user` and `assistant` history roles, reject extra fields or system/developer roles, and retain system instructions on the backend. It MUST NOT include credentials, private account details, saved trip history, or unrelated conversation content. If context is insufficient to understand a follow-up, the assistant MUST ask for clarification.
- **FR-013**: The backend MUST use the real OpenAI provider when `OPENAI_API_KEY` is configured in its environment; `OPENAI_MODEL` MAY be configured and MUST default to `gpt-4.1-mini` when omitted. No company provider/budget approval settings or `DRIVE_WISE_AI_ENABLED` approval gate may be required. If required OpenAI configuration is absent, the backend MUST return an honest unavailable error without a canned answer and the interface MUST preserve the question for retry. The API key MUST remain backend-only and MUST never be logged, returned, or exposed.
- **FR-014**: Voice recognition MUST run on-device only. The application MUST NOT upload or transmit recorded audio to Drive Wise or any external provider.
- **FR-015**: If on-device speech recognition is unavailable, unsupported, or denied permission, the system MUST show a relevant error and keep typed question entry available.
- **FR-016**: The user MUST be able to start and stop voice recording using the microphone control. The interface MUST clearly indicate active recording.
- **FR-017**: When on-device recognition ends, recognized speech MUST be placed in the editable text field. The system MUST NOT send a transcription automatically; the user MUST be able to review and change it before activating Send.
- **FR-018**: If microphone access or speech recognition is unavailable, denied, or fails, the interface MUST show a relevant error and preserve typed text interaction.
- **FR-019**: Each assistant answer MUST provide a control to start spoken playback and, while playback is active, a way to stop it. Closing the chat MUST stop active recording and playback. Text answers MUST remain available if playback is unsupported or fails.
- **FR-020**: Errors from authentication, assistant service, recording, transcription, and playback MUST be presented in understandable language without exposing credentials or internal service details. A failed answer request MUST preserve the question for retry.
- **FR-021**: Assistant controls MUST have accessible names, support keyboard operation, and expose loading and recording status to assistive technology.
- **FR-022**: Changes for this feature MUST be limited to the assistant and elements required to make it work. The rest of the trip-planning page's content, appearance, components, navigation, and existing functionality MUST remain unchanged.
- **FR-023**: Activating Send MUST submit only the exact non-empty question currently displayed in the input. If the request fails or the service is unavailable, the question MUST remain available in the input for editing or retry.
- **FR-024**: The client MUST NOT automatically retry a provider request. Each retry requires a new user activation of Send. When required OpenAI configuration is absent, the backend MUST make zero provider calls and the interface MUST report unavailability.

### Key Entities

- **Question**: Text entered or transcribed by the user and the language hint used to prepare an answer.
- **Assistant answer**: Travel guidance displayed in the conversation, including uncertainty and approximate estimates where applicable.
- **Conversation**: The transient user and assistant messages displayed in the current chat session; recent messages may be sent as bounded context for follow-up questions, but are never persisted as a saved trip record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all tested open/close cycles, the launcher is visible only while the chat is closed, sits in the bottom-right opposite the existing “N” emblem in the bottom-left, and returns to the same position after closing.
- **SC-002**: In all tested viewports, opening and closing the chat does not change the underlying page layout, content, navigation, or existing controls; the chat remains usable on small screens.
- **SC-003**: At least 90% of test users can send an in-scope written travel question and identify the corresponding answer without assistance.
- **SC-004**: In every tested Send flow with OpenAI configuration present, the exact displayed question causes one provider request through the authenticated FastAPI backend, no separate confirmation dialog is shown, and no automatic retry occurs.
- **SC-005**: With required OpenAI configuration absent, 100% of tested answer attempts result in zero provider requests and a clear user-facing unavailable state.
- **SC-006**: In all tested voice flows, recording state is visible, the transcription is editable, and no recognized text is sent before the user explicitly activates Send.
- **SC-007**: In all tested voice flows, audio remains on-device and zero audio uploads occur; typed entry remains available when local recognition is unavailable.
- **SC-008**: In all tested playback flows, users can stop speech and the written answer remains available.
- **SC-009**: In all tested failure cases for microphone access, transcription, assistant service, or playback, an understandable error is shown and text interaction remains usable.
- **SC-010**: All tested distance and duration estimates are labeled approximate, no tested answer presents unverified live travel information as confirmed, and no tested UI claims that an API request is free.
- **SC-011**: In every tested unauthenticated or CSRF-invalid backend request, zero external AI provider requests occur.

## Assumptions

- The assistant is available to signed-in users on the existing trip-planning page.
- Romanian and English are the initial supported languages based on the current assistant contract; the assistant follows the language used in the question.
- The backend calls OpenAI when required runtime configuration is present. No separate company approval gate or in-app user confirmation is used; requests may incur charges to the company.
- Voice recognition is on-device only. Audio is never uploaded or transmitted externally.
- The assistant reuses the application's existing sign-in and authenticated access behavior.
- Conversation content is transient and is not saved as account history or used to enrich trip planning.
- Voice transcription and spoken playback depend on supported device/browser capabilities; text entry and readable answers remain the fallback.
- The assistant has no verified live travel data. A later live-data integration or conversation-retention feature requires a separate product decision.
- The requested visual reference is represented by the user's description: dark navy, turquoise border, compact floating panel, message bubbles, and the specified controls.
