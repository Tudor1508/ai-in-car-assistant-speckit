from fastapi import Depends, HTTPException

from src.auth.dependencies import require_account
from src.data.models.account import Account


def require_admin(account: Account = Depends(require_account)) -> Account:
    if account.role != "admin":
        raise HTTPException(status_code=403, detail="admin_required")
    return account
