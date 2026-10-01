from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.passwords import verify_password
from src.auth.schemas import ProfilePatch
from src.data.models.account import Account, utc_now


def public_account(account: Account) -> dict:
    return {
        "id": account.id,
        "name": account.name,
        "email": account.email,
        "email_verified": False,
        "role": account.role,
    }


def update_profile(db: Session, account: Account, body: ProfilePatch) -> Account:
    if body.name is not None:
        account.name = body.name
    if body.email is not None:
        if not verify_password(account.password_hash, body.current_password or ""):
            raise HTTPException(status_code=403, detail="invalid_current_password")
        normalized = body.email.strip().casefold()
        duplicate = db.scalar(select(Account.id).where(
            Account.email_normalized == normalized, Account.id != account.id
        ))
        if duplicate:
            raise HTTPException(status_code=409, detail="email_unavailable")
        account.email = body.email
        account.email_normalized = normalized
    account.updated_at = utc_now()
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="email_unavailable") from None
    return account
