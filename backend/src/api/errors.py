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
            "invalid_credentials": "Email or password is incorrect",
            "email_unavailable": "Email is unavailable",
            "invalid_current_password": "Current password is incorrect",
            "confirmation_required": "Confirmation is required",
            "not_found": "The requested resource was not found",
            "vehicle_not_found": "The requested resource was not found",
            "validation_error": "Vehicle details do not meet the requirements",
        }
        detail = exc.detail if isinstance(exc.detail, str) else ""
        code = detail if detail in safe_codes else "http_error"
        message = safe_codes.get(code, "The request could not be completed")
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "error": {
                    "code": code,
                    "message": message,
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
