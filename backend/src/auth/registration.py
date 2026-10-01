import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.passwords import hash_password
from src.auth.schemas import RegisterRequest
from src.data.models.account import Account


def register_account(db: Session, body: RegisterRequest) -> Account:
    normalized = body.email.strip().casefold()
    if db.scalar(select(Account.id).where(Account.email_normalized == normalized)):
        raise HTTPException(status_code=409, detail="email_unavailable")
    account = Account(
        id=uuid.uuid4().hex,
        name=body.name,
        email=body.email,
        email_normalized=normalized,
        password_hash=hash_password(body.password),
        role="user",
        status="active",
    )
    db.add(account)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="email_unavailable") from None
    return account
