from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from src.api.responses import ErrorEnvelope, SuccessEnvelope, common_error_responses, success_envelope
from src.auth.dependencies import require_account, require_csrf
from src.assistant.provider import ProviderUnavailable, SpeechLanguageUnavailable, TranscriptionFormatUnavailable, answer_travel_question, provider_status, supports_transcription_format, synthesize_answer_speech, transcribe_recording
from src.assistant.schemas import AssistantMessageRequest, AssistantMessageResponse, AssistantSpeechRequest, AssistantStatusResponse
from src.data.models.account import Account

router = APIRouter(prefix="/assistant", tags=["assistant"])
Provider = Callable[[str, str | None, list[dict[str, str]]], Awaitable[dict[str, str | bool]]]
SpeechProvider = Callable[[str, str], Awaitable[bytes]]
TranscriptionProvider = Callable[[bytes, str], Awaitable[str]]
MAX_TRANSCRIPTION_UPLOAD_BYTES = 25 * 1024 * 1024


def get_answer_provider() -> Provider:
    return answer_travel_question


def get_speech_provider() -> SpeechProvider:
    return synthesize_answer_speech


def get_transcription_provider() -> TranscriptionProvider:
    return transcribe_recording


@router.get(
    "/status",
    response_model=SuccessEnvelope[AssistantStatusResponse],
    responses=common_error_responses(),
)
def assistant_status(_account: Annotated[Account, Depends(require_account)]) -> dict:
    return success_envelope(provider_status())


@router.post(
    "/messages",
    response_model=SuccessEnvelope[AssistantMessageResponse],
    responses=common_error_responses() | {
        502: {"model": ErrorEnvelope, "description": "Assistant provider unavailable"},
        503: {"model": ErrorEnvelope, "description": "OpenAI configuration is unavailable"},
    },
)
async def post_message(
    body: AssistantMessageRequest,
    _account: Annotated[Account, Depends(require_account)],
    _csrf=Depends(require_csrf),
    provider: Provider = Depends(get_answer_provider),
) -> dict:
    if provider_status()["enabled"] is not True:
        raise HTTPException(status_code=503, detail="assistant_unavailable")
    try:
        history = [message.model_dump() for message in body.history]
        reply = await provider(body.question, body.locale, history)
    except ProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="assistant_unavailable") from error
    return success_envelope({"reply": reply})


@router.post(
    "/speech",
    responses=common_error_responses() | {
        422: {"model": ErrorEnvelope, "description": "Speech language is unsupported"},
        502: {"model": ErrorEnvelope, "description": "Speech provider unavailable"},
        503: {"model": ErrorEnvelope, "description": "OpenAI configuration is unavailable"},
    },
)
async def post_speech(
    body: AssistantSpeechRequest,
    _account: Annotated[Account, Depends(require_account)],
    _csrf=Depends(require_csrf),
    provider: SpeechProvider = Depends(get_speech_provider),
) -> Response:
    if provider_status()["enabled"] is not True:
        raise HTTPException(status_code=503, detail="assistant_unavailable")
    try:
        audio = await provider(body.text, body.language)
    except SpeechLanguageUnavailable as error:
        raise HTTPException(status_code=422, detail="speech_language_unsupported") from error
    except ProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="assistant_unavailable") from error
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@router.post(
    "/transcriptions",
    response_model=SuccessEnvelope[dict[str, str]],
    responses=common_error_responses() | {
        413: {"model": ErrorEnvelope, "description": "Recording exceeds the upload limit"},
        415: {"model": ErrorEnvelope, "description": "Recording format is unsupported"},
        502: {"model": ErrorEnvelope, "description": "Transcription provider unavailable"},
        503: {"model": ErrorEnvelope, "description": "OpenAI configuration is unavailable"},
    },
)
async def post_transcription(
    request: Request,
    _account: Annotated[Account, Depends(require_account)],
    _csrf=Depends(require_csrf),
    provider: TranscriptionProvider = Depends(get_transcription_provider),
) -> dict:
    if provider_status()["enabled"] is not True:
        raise HTTPException(status_code=503, detail="assistant_unavailable")
    content_type = request.headers.get("content-type", "")
    if not supports_transcription_format(content_type):
        raise HTTPException(status_code=415, detail="audio_format_unsupported")
    chunks: list[bytes] = []
    total_bytes = 0
    async for chunk in request.stream():
        total_bytes += len(chunk)
        if total_bytes > MAX_TRANSCRIPTION_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="audio_too_large")
        chunks.append(chunk)
    recording = b"".join(chunks)
    if not recording:
        raise HTTPException(status_code=422, detail="audio_invalid")
    try:
        transcript = await provider(recording, content_type)
    except TranscriptionFormatUnavailable as error:
        raise HTTPException(status_code=415, detail="audio_format_unsupported") from error
    except ProviderUnavailable as error:
        raise HTTPException(status_code=502, detail="transcription_unavailable") from error
    return success_envelope({"text": transcript})
