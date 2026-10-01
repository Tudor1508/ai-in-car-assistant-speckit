from fastapi import HTTPException

from src.data.models.account import Account


def require_self(actor: Account, target_account_id: str) -> None:
    if actor.id != target_account_id:
        raise HTTPException(status_code=404, detail="not_found")


def trusted_role_change(db, account: Account, role: str) -> None:
    from src.auth.sessions import apply_trusted_role_change

    apply_trusted_role_change(db, account, role)
