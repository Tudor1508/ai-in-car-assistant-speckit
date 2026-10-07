# Data Model: AI Travel Concierge

## Scope

Conversation messages, drafts, transcripts, and audio are not persisted. The feature adds no consent-grant storage or database migration. OpenAI configuration is held only in the backend environment.

## Entities

### Assistant Message (client transient)

Represents one displayed user question or assistant response in the open page session.

| Field | Type | Validation / meaning |
|---|---|---|
| `id` | opaque client identifier | Unique in the current page session; not sent as provider identity |
| `role` | `user` or `assistant` | Controls alignment and associated controls |
| `text` | string | User question or assistant response; user request limited to 2,000 characters |
| `language` | BCP 47 tag (`ro-RO` or `en-US`) | For assistant replies, identifies the answer language for local speech voice selection; requests use a separate `ro` or `en` locale hint |

Message list, draft, pending state, recording state, and playback state remain component-local. No server conversation history is created.

### OpenAI Runtime Configuration (server-only)

Controls whether the backend can call OpenAI. It is read by backend status and provider logic and is never accepted from the browser.

| Field | Type | Validation / meaning |
|---|---|---|
| `OPENAI_API_KEY` | secret string | Required; backend-only; its value is never returned or logged |
| `OPENAI_MODEL` | string | Optional; defaults to `gpt-4.1-mini` |

No `DRIVE_WISE_AI_ENABLED` or company budget-approval setting is required. If required OpenAI configuration is absent, status is unavailable and no provider request is made. Requests may incur charges to the company.

### Local Transcription Result (client transient)

| Field | Type | Validation / meaning |
|---|---|---|
| `text` | string | Editable question draft; never auto-submitted |
| `language` | supported locale | Uses the recognized language where supported; initial locales are Romanian and English |
| `processing_mode` | local-only | Recognition runs on-device only when the browser exposes local processing and confirms a local language pack |

Audio is never uploaded or sent to Drive Wise or an external provider. Unsupported local recognition leaves the draft editable and typed entry available.

## Relationships and Lifecycle

- Assistant messages and transcription results exist only in browser memory and have no database relationship.
- Activating Send sends the current non-empty question and locale to the authenticated API. The backend calls OpenAI when required configuration is present.
- The provider key remains server-side and is never returned to the client.
