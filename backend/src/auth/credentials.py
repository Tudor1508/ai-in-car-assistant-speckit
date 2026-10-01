from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.auth.passwords import hash_password, verify_password
from src.auth.schemas import PasswordChangeRequest
from src.auth.sessions import revoke_all_sessions
from src.data.models.account import Account, utc_now


def change_password(db: Session, account: Account, body: PasswordChangeRequest) -> None:
    if not verify_password(account.password_hash, body.current_password):
        raise HTTPException(status_code=403, detail="invalid_current_password")
    account.password_hash = hash_password(body.new_password)
    account.updated_at = utc_now()
    revoke_all_sessions(db, account.id)
