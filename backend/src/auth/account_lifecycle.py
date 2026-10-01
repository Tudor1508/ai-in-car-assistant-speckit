from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.auth.passwords import verify_password
from src.auth.sessions import revoke_all_sessions
from src.data.models.account import Account, utc_now


def deactivate_account(db: Session, account: Account, current_password: str | None, confirmation: str) -> None:
    if confirmation != "DELETE":
        raise HTTPException(status_code=422, detail="confirmation_required")
    if not verify_password(account.password_hash, current_password or ""):
        raise HTTPException(status_code=403, detail="invalid_current_password")
    account.status = "disabled"
    account.updated_at = utc_now()
    revoke_all_sessions(db, account.id)
