from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.config import SESSION_ABSOLUTE_SECONDS, SESSION_IDLE_SECONDS
from src.auth.tokens import new_opaque_token, token_digest
from src.auth.sessions import find_active_session
from src.data.models.anonymous_csrf_context import AnonymousCsrfContext
from src.data.models.auth_session import AuthSession


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def is_context_expired(context: AnonymousCsrfContext, now: datetime) -> bool:
    current = _aware(now)
    return (
        current - _aware(context.last_seen_at) >= timedelta(seconds=SESSION_IDLE_SECONDS)
        or current - _aware(context.created_at)
        >= timedelta(seconds=SESSION_ABSOLUTE_SECONDS)
    )


def issue_anonymous_context(
    db: Session, now: datetime | None = None
) -> tuple[AnonymousCsrfContext, str, str]:
    created = now or utc_now()
    context_id = new_opaque_token()
    csrf_token = new_opaque_token()
    context = AnonymousCsrfContext(
        id_digest=token_digest(context_id),
        csrf_token_digest=token_digest(csrf_token),
        created_at=created,
        last_seen_at=created,
    )
    db.add(context)
    db.flush()
    return context, context_id, csrf_token


def find_active_anonymous_context(
    db: Session, context_id: str, now: datetime | None = None
) -> AnonymousCsrfContext | None:
    context = db.get(AnonymousCsrfContext, token_digest(context_id))
    current = now or utc_now()
    if context is None or context.revoked_at is not None:
        return None
    if is_context_expired(context, current):
        context.revoked_at = current
        db.commit()
        return None
    return context


def touch_anonymous_context(
    context: AnonymousCsrfContext, now: datetime | None = None
) -> None:
    context.last_seen_at = now or utc_now()


def validate_csrf_token(expected_digest: str, presented_token: str | None) -> bool:
    return bool(
        presented_token
        and secrets_compare(expected_digest, token_digest(presented_token))
    )


def secrets_compare(left: str, right: str) -> bool:
    import secrets

    return secrets.compare_digest(left, right)


def enforce_request_origin(request: Request, allowed_origins: list[str]) -> None:
    origin = request.headers.get("origin")
    if origin is None:
        referer = request.headers.get("referer")
        if referer:
            parsed = urlsplit(referer)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None
    if origin not in allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="invalid_origin",
            headers={"Cache-Control": "no-store"},
        )


def find_bound_csrf_state(
    db: Session,
    context_id: str,
    presented_token: str | None,
    now: datetime | None = None,
    *,
    anonymous_only: bool = False,
) -> tuple[str, AnonymousCsrfContext | AuthSession] | None:
    anonymous = find_active_anonymous_context(db, context_id, now)
    if anonymous is not None and validate_csrf_token(
        anonymous.csrf_token_digest, presented_token
    ):
        touch_anonymous_context(anonymous, now)
        # Persist valid activity before the route can return a domain error.
        db.commit()
        return "anonymous", anonymous
    if anonymous_only:
        return None
    auth_session = find_active_session(db, context_id, now)
    if auth_session is not None and validate_csrf_token(auth_session.csrf_token_digest, presented_token):
        return "authenticated", auth_session
    return None


def _session_expired(auth_session: AuthSession, now: datetime) -> bool:
    current = _aware(now)
    return (
        current - _aware(auth_session.last_seen_at) >= timedelta(seconds=SESSION_IDLE_SECONDS)
        or current - _aware(auth_session.created_at)
        >= timedelta(seconds=SESSION_ABSOLUTE_SECONDS)
    )


def rotate_anonymous_context(
    db: Session,
    context: AnonymousCsrfContext,
    now: datetime | None = None,
) -> tuple[str, str]:
    current = now or utc_now()
    context.revoked_at = current
    replacement, context_id, csrf_token = issue_anonymous_context(db, current)
    # Cookie rotation must preserve the original absolute-expiry origin.
    replacement.created_at = context.created_at
    replacement.last_seen_at = current
    return context_id, csrf_token


def rotate_authenticated_csrf(
    auth_session: AuthSession,
) -> str:
    token = new_opaque_token()
    auth_session.csrf_token_digest = token_digest(token)
    return token
