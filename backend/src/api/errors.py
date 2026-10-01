from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


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
