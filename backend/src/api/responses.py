from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class SuccessEnvelope(BaseModel, Generic[T]):
    data: T


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[dict[str, Any]] | None = None
    request_id: str | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody


def success_envelope(data: Any) -> dict[str, Any]:
    """Wrap an operation's result in the shared success envelope."""
    return {"data": data}


def common_error_responses() -> dict[int, dict[str, Any]]:
    """OpenAPI response declarations shared by future API operations."""
    return {
        404: {
            "model": ErrorEnvelope,
            "description": "The requested route or resource was not found",
        },
        405: {
            "model": ErrorEnvelope,
            "description": "The HTTP method is not allowed for this route",
        },
        422: {
            "model": ErrorEnvelope,
            "description": "Request validation failed",
        },
        500: {
            "model": ErrorEnvelope,
            "description": "Unexpected server error",
        },
    }
