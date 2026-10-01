import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope
from src.auth.account_lifecycle import deactivate_account
from src.auth.config import COOKIE_NAME, get_allowed_origins
from src.auth.cookies import clear_session_cookie, set_session_cookie
from src.auth.csrf import (
    enforce_request_origin,
    find_active_anonymous_context,
    issue_anonymous_context,
    rotate_anonymous_context,
    rotate_authenticated_csrf,
    utc_now,
)
from src.auth.credentials import change_password
from src.auth.dependencies import get_db, require_account, require_csrf
from src.auth.passwords import verify_password
from src.auth.profile import public_account, update_profile
from src.auth.registration import register_account
from src.auth.schemas import (
    DeactivateRequest,
    AccountResponse,
    CsrfResponse,
    LoginRequest,
    PasswordChangeRequest,
    ProfilePatch,
    RegisterRequest,
    LoginResponse,
    StatusResponse,
)
from src.auth.sessions import (
    create_authenticated_session,
    find_active_session,
    revoke_all_sessions,
    revoke_session,
)
from src.auth.tokens import new_opaque_token, token_digest
from src.data.models.account import Account
from src.data.models.auth_session import AuthSession

router = APIRouter(prefix="/auth", tags=["authentication"])


def csrf_error() -> HTTPException:
    return HTTPException(status_code=403, detail="invalid_csrf", headers={"Cache-Control": "no-store"})


@router.post("/csrf/bootstrap", response_model=SuccessEnvelope[CsrfResponse], responses=common_error_responses())
def csrf_bootstrap(request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_request_origin(request, get_allowed_origins())
    cookie_id = request.cookies.get(COOKIE_NAME)
    if cookie_id:
        auth_session = find_active_session(db, cookie_id)
        if auth_session:
            auth_session.last_seen_at = utc_now()
            token = rotate_authenticated_csrf(auth_session)
            return success_envelope({"csrf_token": token})
        anonymous = find_active_anonymous_context(db, cookie_id)
        if anonymous:
            cookie_id, token = rotate_anonymous_context(db, anonymous)
            set_session_cookie(response, cookie_id)
            return success_envelope({"csrf_token": token})
    _, cookie_id, token = issue_anonymous_context(db)
    set_session_cookie(response, cookie_id)
    return success_envelope({"csrf_token": token})


@router.post("/register", status_code=201, response_model=SuccessEnvelope[AccountResponse], responses=common_error_responses())
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db), _csrf=Depends(require_csrf)):
    account = register_account(db, body)
    return success_envelope(public_account(account))


@router.post("/login", response_model=SuccessEnvelope[LoginResponse], responses=common_error_responses())
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_request_origin(request, get_allowed_origins())
    cookie_id = request.cookies.get(COOKIE_NAME)
    csrf_state = None
    if cookie_id:
        from src.auth.csrf import find_bound_csrf_state
        csrf_state = find_bound_csrf_state(db, cookie_id, request.headers.get("X-CSRF-Token"), anonymous_only=True)
    if not csrf_state or csrf_state[0] != "anonymous":
        raise csrf_error()
    normalized = body.email.strip().casefold()
    account = db.query(Account).filter(Account.email_normalized == normalized).first()
    if not account or account.status != "active" or not verify_password(account.password_hash, body.password):
        raise HTTPException(status_code=401, detail="invalid_credentials", headers={"Cache-Control": "no-store"})
    anonymous = csrf_state[1]
    anonymous.revoked_at = __import__("src.auth.sessions", fromlist=["utc_now"]).utc_now()
    session, new_id, csrf_token = create_authenticated_session(db, account)
    set_session_cookie(response, new_id)
    return success_envelope({"account": public_account(account), "csrf_token": csrf_token})


@router.post("/logout", response_model=SuccessEnvelope[StatusResponse], responses=common_error_responses())
def logout(request: Request, response: Response, db: Session = Depends(get_db), account: Account = Depends(require_account), csrf=Depends(require_csrf)):
    session = request.state.auth_session
    revoke_session(session)
    clear_session_cookie(response)
    return success_envelope({"status": "signed_out"})


@router.get("/me", response_model=SuccessEnvelope[AccountResponse], responses=common_error_responses())
def read_me(account: Account = Depends(require_account)):
    return success_envelope(public_account(account))


@router.patch("/me", response_model=SuccessEnvelope[AccountResponse], responses=common_error_responses())
def patch_me(body: ProfilePatch, account: Account = Depends(require_account), db: Session = Depends(get_db), _csrf=Depends(require_csrf)):
    update_profile(db, account, body)
    return success_envelope(public_account(account))


@router.post("/me/password", response_model=SuccessEnvelope[StatusResponse], responses=common_error_responses())
def password_me(body: PasswordChangeRequest, request: Request, response: Response, account: Account = Depends(require_account), db: Session = Depends(get_db), _csrf=Depends(require_csrf)):
    change_password(db, account, body)
    clear_session_cookie(response)
    return success_envelope({"status": "password_changed"})


@router.delete("/me", response_model=SuccessEnvelope[StatusResponse], responses=common_error_responses())
def delete_me(body: DeactivateRequest, response: Response, account: Account = Depends(require_account), db: Session = Depends(get_db), _csrf=Depends(require_csrf)):
    deactivate_account(db, account, body.current_password, body.confirmation)
    clear_session_cookie(response)
    return success_envelope({"status": "disabled"})
