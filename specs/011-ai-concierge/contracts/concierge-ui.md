# Contract: Floating Travel Concierge UI

## Scope and boundaries

The concierge is a page-local feature on the existing signed-in trip-planning page. It is mounted without changing other page content, visual styling, component order, navigation, or behavior. The launcher and panel are fixed overlays outside normal layout flow and never cause the underlying page to reflow.

## Launcher and panel states

| State | Visible behavior |
|---|---|
| Closed | One circular launcher fixed at bottom-right, opposite the existing “N” emblem at bottom-left; panel is hidden |
| Open | Compact floating panel visible; launcher hidden; title is `Drivewise Assistant` |
| Close action | X closes the panel, stops active recognition/playback, preserves page layout, and restores launcher at the same position |
| Narrow viewport | Panel stays within viewport safe margins; header, scrollable message area, input, and controls remain operable |

The panel uses a dark navy background, turquoise outline, separate user/assistant message bubbles, close control, text field, Send, microphone/recording control, and per-answer audio control. The widget must not insert an in-flow placeholder or reserve page space.

## Conversation interaction

- Text question draft is editable until submitted and remains in the field if sending fails or required OpenAI configuration is unavailable.
- Blank or whitespace-only questions are not sent.
- User and assistant messages appear in separate bubbles. Loading, unavailable-provider, authentication, provider, recording, recognition, and playback states are announced to assistive technology and shown as understandable inline feedback.
- Do not show an AI-use confirmation dialog or consent step. A concise persistent notice identifies the configured provider and states clearly that chatbot requests may incur charges to the company; it does not claim requests are free.
- If required OpenAI configuration is unavailable, report that service is unavailable and preserve the draft.
- Activating Send calls `POST /assistant/messages` through the shared authenticated API client with the exact non-empty question and locale. The backend invokes OpenAI when its required backend configuration is present; requests may incur charges to the company.
- The client must not automatically retry a provider request. If an attempt fails, the question remains available and the user may edit it or activate Send again.
- Send includes only the new question, locale, and bounded recent user/assistant messages from this chat session; no credentials, trip records, audio, or unrelated history are passed as context.

## Voice input

- Recognition may start only after microphone permission and only where the browser advertises on-device-only speech recognition for the selected locale. Recognition is explicitly configured for local processing; remote fallback is prohibited.
- The interface clearly shows when local recognition is active. Stopping recognition puts returned words in the editable draft; it never sends them automatically.
- If the browser does not support enforced local recognition, the locale pack is unavailable, microphone access is denied, or recognition errors, show an explanatory unavailable/error state. Typed entry remains usable.
- No audio recording blob is sent to Drive Wise or any external service. Voice recognition is on-device only.

## Spoken answer playback

- Each assistant answer has Play and active Stop states.
- Use only an available local speech voice matching the response language. Do not select remote voices.
- Playback ends or is canceled when it completes, fails, the user presses Stop, or the chat closes. Text remains visible in every case.

## Accessibility and regression criteria

- All icon-only controls have accessible names and keyboard focus/activation behavior.
- Focus order moves through launcher, panel title/close, messages, input, microphone, and Send in a logical order; opening/closing does not trap focus outside the widget.
- Recording/loading state uses a live status announcement; errors use an alert announcement.
- Browser tests capture the trip planner before and after open/close and assert the underlying content, component positions, navigation, and existing actions do not change. Validate the panel at desktop and narrow viewport sizes.
