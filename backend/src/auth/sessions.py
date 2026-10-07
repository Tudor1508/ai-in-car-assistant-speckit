from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.config import SESSION_ABSOLUTE_SECONDS, SESSION_IDLE_SECONDS
from src.auth.tokens import new_opaque_token, token_digest
from src.data.models.account import Account
from src.data.models.auth_session import AuthSession


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def is_session_expired(auth_session: AuthSession, now: datetime) -> bool:
    current = _aware(now)
    return (
        current - _aware(auth_session.last_seen_at) >= timedelta(seconds=SESSION_IDLE_SECONDS)
        or current - _aware(auth_session.created_at)
        >= timedelta(seconds=SESSION_ABSOLUTE_SECONDS)
    )


def create_authenticated_session(
    db: Session, account: Account, now: datetime | None = None
) -> tuple[AuthSession, str, str]:
    created = now or utc_now()
    session_id = new_opaque_token()
    csrf_token = new_opaque_token()
    auth_session = AuthSession(
        id_digest=token_digest(session_id),
        account_id=account.id,
        csrf_token_digest=token_digest(csrf_token),
        created_at=created,
        last_seen_at=created,
    )
    db.add(auth_session)
    db.flush()
    return auth_session, session_id, csrf_token


def find_active_session(
    db: Session, session_id: str, now: datetime | None = None
) -> AuthSession | None:
    auth_session = db.get(AuthSession, token_digest(session_id))
    current = now or utc_now()
    if auth_session is None or auth_session.revoked_at is not None:
        return None
    if is_session_expired(auth_session, current):
        auth_session.revoked_at = current
        db.commit()
        return None
    return auth_session


def revoke_session(auth_session: AuthSession, now: datetime | None = None) -> None:
    auth_session.revoked_at = now or utc_now()


def revoke_all_sessions(
    db: Session, account_id: str, now: datetime | None = None
) -> int:
    current = now or utc_now()
    sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.account_id == account_id, AuthSession.revoked_at.is_(None)
        )
    ).all()
    for auth_session in sessions:
        auth_session.revoked_at = current
    return len(sessions)


def apply_trusted_role_change(
    db: Session, account: Account, role: str, now: datetime | None = None
) -> None:
    if role not in {"user", "admin", "producer"}:
        raise ValueError("Unsupported account role")
    if account.role != role:
        if role == "admin":
            existing = db.scalar(select(Account.id).where(Account.admin_slot == "primary", Account.id != account.id))
            if existing:
                raise ValueError("An administrator is already provisioned")
            account.admin_slot = "primary"
        else:
            account.admin_slot = None
        account.role = role
        account.updated_at = now or utc_now()
        revoke_all_sessions(db, account.id, now)
