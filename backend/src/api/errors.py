from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _safe_validation_details(exc: RequestValidationError) -> list[dict[str, Any]]:
    return [
        {
            "location": list(error.get("loc", ())),
            "message": "Invalid value",
        }
        for error in exc.errors()
    ]


def install_error_handlers(app: FastAPI) -> None:
    """Install shared, client-safe handlers on an API application."""

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": _safe_validation_details(exc),
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        safe_codes = {
            "invalid_origin": "The request origin is not allowed",
            "invalid_csrf": "The request could not be verified",
            "authentication_required": "Authentication is required",
            "admin_required": "Administrator access is required",
            "invalid_credentials": "Email or password is incorrect",
            "email_unavailable": "Email is unavailable",
            "invalid_current_password": "Current password is incorrect",
            "confirmation_required": "Confirmation is required",
            "not_found": "The requested resource was not found",
            "vehicle_not_found": "The requested resource was not found",
            "validation_error": "Vehicle details do not meet the requirements",
            "route_not_found": "No drivable route could be calculated",
            "routing_provider_unavailable": "Route data is temporarily unavailable",
            "route_preference_unavailable": "Scenic recommendations are unavailable for this route. Choose Fastest or Shortest.",
            "assistant_unavailable": "The travel assistant is temporarily unavailable",
            "speech_language_unsupported": "Speech playback is unavailable for this language",
            "audio_format_unsupported": "This recording format is not supported",
            "audio_too_large": "The recording is too large to transcribe",
            "audio_invalid": "The recording could not be read",
            "transcription_unavailable": "Speech transcription is temporarily unavailable",
        }
        detail = exc.detail if isinstance(exc.detail, str) else ""
        details = None
        if isinstance(exc.detail, dict) and exc.detail.get("code") == "route_preference_unavailable":
            reason = exc.detail.get("reason")
            safe_reasons = {
                "no_distinct_candidates",
                "poi_geometry_limit",
                "poi_results_incomplete",
                "candidate_comparison_unavailable",
            }
            if reason in safe_reasons:
                detail = "route_preference_unavailable"
                details = [{"preference": "scenic", "reason": reason}]
        code = detail if detail in safe_codes else "http_error"
        message = safe_codes.get(code, "The request could not be completed")
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "error": {
                    "code": code,
                    "message": message,
                    **({"details": details} if details is not None else {}),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred",
                }
            },
        )
