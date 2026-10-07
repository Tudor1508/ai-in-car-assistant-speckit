# Contract: Assistant API

## Conventions

- Use the existing authenticated FastAPI JSON API, `data` success envelope, safe `error` envelope, and shared credentialed frontend client.
- `POST /assistant/messages` requires the existing account authentication, allowed-origin, and CSRF checks.
- The frontend sends the new question, locale, and a bounded history of recent user/assistant messages from the current chat to FastAPI. The backend calls the real OpenAI provider when its backend-only configuration is present.
- Keep the provider API key in the backend environment. Codex must not inspect or retrieve its value. The application must never return it to the browser or include its value in logs, errors, status responses, or other output.
- Send the question, locale, and validated current-chat history to the provider. Do not include account details, trip records, unrelated conversation content, credentials, or audio.
- No app-level consent endpoint, consent token, consent grant, or consent database migration is part of this feature.

## Provider configuration and status

### `GET /assistant/status`

Authenticated, read-only. Reports whether the OpenAI provider is configured and available, returning only safe display metadata.

Success `data`:

```json
{
  "enabled": false,
  "availability": "temporarily_unavailable",
  "provider": null,
  "charge_notice": "Chatbot requests may incur charges to the company."
}
```

When enabled, `provider` contains `OpenAI`. The backend requires `OPENAI_API_KEY`; `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. Missing required configuration or provider outages are reported as temporarily unavailable. Do not return credential names, endpoint URLs, secrets, or a claim that requests are free. Never return or log the API key value.

## Answer request

### `POST /assistant/messages`

Authenticated and CSRF-protected. The frontend calls this endpoint directly when the user activates Send. No separate confirmation dialog or consent step appears. The backend validates access and request fields, then calls OpenAI when the required backend configuration is present. Requests may incur charges to the company. The client does not automatically retry.

Request:

```json
{
  "question": "Suggest a weekend in Brașov",
  "locale": "ro",
  "history": [
    { "role": "user", "text": "Suggest a route from Cluj to Bucharest." },
    { "role": "assistant", "text": "The route can pass near Sibiu." }
  ]
}
```

Validation: trim surrounding whitespace; reject blank or over 2,000 characters; request `locale` is `ro` or `en`; `history` contains at most 10 messages, each at most 4,000 characters, with a combined question and history maximum of 8,000 characters. Only `user` and `assistant` roles are accepted; extra fields and `system`/`developer` roles are rejected. The backend retains system instructions and sends history in chronological order followed by the new question. History is transient and is not persisted or logged. When available context is insufficient to resolve a follow-up, the assistant asks a clarifying question. The reply `language` MUST be a BCP 47 tag (`ro-RO` or `en-US`) matching the language of the answer text, so local speech playback can select a voice for that language. If required OpenAI configuration is absent, return a safe unavailable response without contacting the provider. Disable provider-side storage where supported.

Success `data`:

```json
{
  "reply": {
    "text": "...",
    "language": "ro-RO",
    "is_demo": false
  }
}
```

## Errors

Use the existing safe error envelope. No error includes the question, provider credential, internal exception, or secret configuration value.

| Status/code | Meaning | Provider called? |
|---|---|---|
| `401 authentication_required` | No active signed-in session | No |
| `403 invalid_csrf` | Origin or CSRF check failed | No |
| `422 validation_error` | Invalid request fields | No |
| `503 assistant_unavailable` | Required OpenAI configuration is absent | No |
| `502 assistant_unavailable` | Provider request failed or returned no usable answer | One provider request may have occurred |

No speech-recognition audio endpoint is introduced. Speech recognition is on-device only. Audio is not uploaded or sent to Drive Wise or an external provider.

## Compatibility decision

The existing `/assistant/messages` request schema removes the client-supplied `provider_consent` field and accepts only `question` and `locale`. This is an intentional schema change for the first-party widget; legacy callers supplying extra fields receive validation failure and MUST NOT reach a provider. Preserve the route path and response envelope. Review any external consumers before release.
