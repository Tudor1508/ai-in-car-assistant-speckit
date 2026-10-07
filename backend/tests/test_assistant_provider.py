import asyncio

import httpx
import pytest

from src.assistant import provider


def configure_fake_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-fake-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    monkeypatch.setenv("DRIVE_WISE_AI_ENABLED", "false")
    for name in (
        "DRIVE_WISE_AI_APPROVED_PROVIDER",
        "DRIVE_WISE_AI_BUDGET_APPROVAL_ID",
        "DRIVE_WISE_AI_BUDGET_AMOUNT",
        "DRIVE_WISE_AI_BUDGET_CURRENCY",
        "DRIVE_WISE_AI_BUDGET_PERIOD",
        "DRIVE_WISE_AI_APPROVAL_VERSION",
    ):
        monkeypatch.delenv(name, raising=False)


def test_openai_adapter_uses_fake_transport_and_minimal_payload(monkeypatch):
    configure_fake_provider(monkeypatch)
    observed = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"output": [{"content": [{"type": "output_text", "text": "[LANG:ro-RO]\nSugestie de călătorie aproximativă."}]}]}

    class FakeClient:
        def __init__(self, timeout):
            observed["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            observed.update({"url": url, "headers": headers, "payload": json})
            return FakeResponse()

    monkeypatch.setenv("OPENAI_API_KEY", "test-only-fake-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    # The answer's BCP 47 marker must win over the browser/UI locale hint.
    history = [
        {"role": "user", "text": "Suggest a route from Cluj to Bucharest."},
        {"role": "assistant", "text": "The route can pass near Sibiu."},
    ]
    reply = asyncio.run(provider.answer_travel_question("What stop would work along it?", "en", history))

    assert observed["url"] == "https://api.openai.com/v1/responses"
    assert observed["payload"]["input"] == [
        {"role": "user", "content": "Suggest a route from Cluj to Bucharest."},
        {"role": "assistant", "content": "The route can pass near Sibiu."},
        {"role": "user", "content": "User interface language hint: en.\nCurrent question: What stop would work along it?"},
    ]
    assert observed["payload"]["store"] is False
    assert set(observed["payload"]) == {"model", "instructions", "input", "store"}
    assert "tools" not in observed["payload"]
    assert "travel-only" in observed["payload"]["instructions"]
    assert "follow-up references" in observed["payload"]["instructions"]
    assert set(reply) == {"text", "language", "is_demo"}
    assert reply["language"] == "ro-RO"
    assert reply["text"] == "Sugestie de călătorie aproximativă."


@pytest.mark.parametrize(
    ("question", "locale", "history", "response_language"),
    [
        ("Ce atracții recomanzi în Brașov?", "en", [], "ro-RO"),
        ("What attractions do you recommend in Brasov?", "ro", [], "en-US"),
        (
            "What stop would work along that route?",
            "ro",
            [
                {"role": "user", "text": "Recomandă-mi un traseu de la Cluj la București."},
                {"role": "assistant", "text": "Poți opri în Sibiu."},
            ],
            "en-US",
        ),
    ],
    ids=["romanian-question", "english-question", "switch-to-english-follow-up"],
)
def test_reply_language_follows_latest_question_not_interface_locale(
    monkeypatch, question, locale, history, response_language
):
    configure_fake_provider(monkeypatch)
    observed = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"output_text": f"[LANG:{response_language}]\nFake-language-matched response."}

    class FakeClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            observed["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    reply = asyncio.run(provider.answer_travel_question(question, locale, history))

    assert reply["language"] == response_language
    inputs = observed["payload"]["input"]
    assert inputs[-1]["content"].endswith(f"Current question: {question}")
    assert [item["role"] for item in inputs[:-1]] == [item["role"] for item in history]
    assert [item["content"] for item in inputs[:-1]] == [item["text"] for item in history]
    instructions = " ".join(observed["payload"]["instructions"].split())
    assert "based on its text" in instructions
    assert "ignore the interface language hint whenever it conflicts" in instructions
    assert "unless the user's latest question switches languages" in instructions


def test_speech_adapter_uses_fake_transport_and_response_language(monkeypatch):
    configure_fake_provider(monkeypatch)
    observed = {}

    class FakeResponse:
        content = b"fake-mp3-audio"
        headers = {"content-type": "audio/mpeg"}

        def raise_for_status(self):
            return None

    class FakeClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, json):
            observed.update({"url": url, "payload": json})
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    audio = asyncio.run(provider.synthesize_answer_speech("Răspuns în limba română", "ro-RO"))

    assert audio == b"fake-mp3-audio"
    assert observed["url"] == "https://api.openai.com/v1/audio/speech"
    assert observed["payload"] == {
        "model": "gpt-4o-mini-tts",
        "voice": "marin",
        "input": "Răspuns în limba română",
        "instructions": "Speak the provided text in Romanian (language tag ro-RO). Keep the original language; do not translate or switch languages.",
        "response_format": "mp3",
    }


def test_unsupported_speech_language_fails_before_external_transport(monkeypatch):
    configure_fake_provider(monkeypatch)
    constructed = []

    class UnexpectedClient:
        def __init__(self, **kwargs):
            constructed.append(kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", UnexpectedClient)
    with pytest.raises(provider.SpeechLanguageUnavailable):
        asyncio.run(provider.synthesize_answer_speech("Unsupported language text", "xx-XX"))
    assert constructed == []


def test_assistant_reply_parser_accepts_other_bcp47_tts_languages(monkeypatch):
    configure_fake_provider(monkeypatch)

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"output_text": "[LANG:fr-FR]\nRéponse de voyage."}

    class FakeClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    reply = asyncio.run(provider.answer_travel_question("Où aller à Paris?", "en"))
    assert reply["language"] == "fr-FR"
    assert provider.supports_speech_language(reply["language"])


def test_openai_adapter_maps_provider_errors_without_leaking_details(monkeypatch):
    configure_fake_provider(monkeypatch)
    class FailedClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            raise httpx.ConnectError("simulated provider transport failure")

    monkeypatch.setenv("OPENAI_API_KEY", "test-only-fake-key")
    monkeypatch.setattr(httpx, "AsyncClient", FailedClient)
    try:
        asyncio.run(provider.answer_travel_question("Plan a trip", "en"))
    except provider.ProviderUnavailable as error:
        assert "simulated" not in str(error)
    else:
        raise AssertionError("Expected safe provider failure")


def test_missing_openai_key_fails_before_http_client_construction(monkeypatch):
    constructed = []

    class UnexpectedClient:
        def __init__(self, **kwargs):
            constructed.append(kwargs)

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(httpx, "AsyncClient", UnexpectedClient)
    try:
        asyncio.run(provider.answer_travel_question("Plan a trip", "en"))
    except provider.ProviderUnavailable:
        pass
    else:
        raise AssertionError("Expected missing provider configuration to fail closed")
    assert constructed == []


def test_openai_key_is_the_only_required_activation_setting(monkeypatch):
    configure_fake_provider(monkeypatch)
    status = provider.provider_status()
    assert status["enabled"] is True
    assert status["availability"] == "available"
    assert status["provider"] == "OpenAI"


def test_transcription_adapter_uses_fake_transport_and_returns_transcript(monkeypatch):
    configure_fake_provider(monkeypatch)
    observed = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"text": "Suggest a route to Brașov"}

    class FakeClient:
        def __init__(self, timeout):
            observed["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers, data, files):
            observed.update({"url": url, "headers": headers, "data": data, "files": files})
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    transcript = asyncio.run(provider.transcribe_recording(b"fake-audio", "audio/webm;codecs=opus"))

    assert transcript == "Suggest a route to Brașov"
    assert observed["url"] == "https://api.openai.com/v1/audio/transcriptions"
    assert observed["data"] == {"model": "gpt-transcribe", "response_format": "json"}
    filename, audio, mime_type = observed["files"]["file"]
    assert filename == "question.webm"
    assert audio == b"fake-audio"
    assert mime_type == "audio/webm"
    assert "test-only-fake-key" in observed["headers"]["Authorization"]


def test_unsupported_transcription_format_fails_before_external_transport(monkeypatch):
    configure_fake_provider(monkeypatch)
    constructed = []

    class UnexpectedClient:
        def __init__(self, **kwargs):
            constructed.append(kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", UnexpectedClient)
    with pytest.raises(provider.TranscriptionFormatUnavailable):
        asyncio.run(provider.transcribe_recording(b"fake-audio", "audio/unknown"))
    assert constructed == []
