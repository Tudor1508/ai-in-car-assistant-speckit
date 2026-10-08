from fastapi import Depends, HTTPException

from src.auth.dependencies import require_account
from src.data.models.account import Account


def require_producer(account: Account = Depends(require_account)) -> Account:
    if account.role != "producer":
        raise HTTPException(status_code=403, detail="forbidden")
    return account
