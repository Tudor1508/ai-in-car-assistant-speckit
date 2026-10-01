from fastapi import Response

from src.auth.config import COOKIE_NAME


def set_session_cookie(response: Response, value: str) -> None:
    response.set_cookie(
        COOKIE_NAME, value, secure=True, httponly=True, samesite="lax", path="/"
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, secure=True, httponly=True, samesite="lax", path="/")
