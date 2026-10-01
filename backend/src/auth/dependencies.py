from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.auth.config import COOKIE_NAME
from src.auth.csrf import enforce_request_origin, find_bound_csrf_state
from src.auth.config import get_allowed_origins
from src.auth.sessions import find_active_session
from src.data.models.account import Account
from src.data.database import create_session_factory


def get_db(request: Request) -> Iterator[Session]:
    db = create_session_factory(request.app.state.engine)()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def require_csrf(request: Request, db: Session = Depends(get_db)) -> tuple[str, object]:
    enforce_request_origin(request, get_allowed_origins())
    cookie = request.cookies.get(COOKIE_NAME)
    state = find_bound_csrf_state(db, cookie or "", request.headers.get("X-CSRF-Token"))
    if state is None:
        raise HTTPException(status_code=403, detail="invalid_csrf", headers={"Cache-Control": "no-store"})
    return state


def require_account(request: Request, db: Session = Depends(get_db)) -> Account:
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie:
        raise HTTPException(status_code=401, detail="authentication_required")
    session = find_active_session(db, cookie)
    if session is None:
        raise HTTPException(status_code=401, detail="authentication_required")
    account = db.get(Account, session.account_id)
    if account is None or account.status != "active":
        raise HTTPException(status_code=401, detail="authentication_required")
    session.last_seen_at = __import__("src.auth.sessions", fromlist=["utc_now"]).utc_now()
    request.state.auth_session = session
    return account
