from datetime import datetime, timedelta, timezone

from src.auth.csrf import find_bound_csrf_state, issue_anonymous_context, rotate_anonymous_context
from src.auth.sessions import (
    apply_trusted_role_change,
    create_authenticated_session,
    find_active_session,
    is_session_expired,
    revoke_all_sessions,
    revoke_session,
)
from src.data.models.account import Account


def account() -> Account:
    return Account(id="a" * 32, name="A Driver", email="a@example.com", email_normalized="a@example.com", password_hash="unused", role="user", status="active")


def test_session_expiry_idle_absolute_and_revoke(auth_engine, session_factory):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = session_factory()
    user = account()
    db.add(user)
    db.flush()
    row, raw_id, _ = create_authenticated_session(db, user, now)
    assert not is_session_expired(row, now + timedelta(minutes=29))
    assert is_session_expired(row, now + timedelta(minutes=30))
    assert is_session_expired(row, now + timedelta(hours=8))
    row.last_seen_at = now + timedelta(hours=7, minutes=59)
    assert not is_session_expired(row, now + timedelta(hours=8, seconds=-1))
    assert is_session_expired(row, now + timedelta(hours=8))
    row.last_seen_at = now
    assert find_active_session(db, raw_id, now + timedelta(minutes=30)) is None
    assert row.revoked_at is not None
    db.close()


def test_anonymous_token_is_bound_and_rotation_revokes_old_context(session_factory):
    db = session_factory()
    _, raw_id, csrf = issue_anonymous_context(db)
    db.flush()
    assert find_bound_csrf_state(db, raw_id, csrf)[0] == "anonymous"
    assert find_bound_csrf_state(db, raw_id, "wrong") is None
    old = db.get(__import__("src.data.models.anonymous_csrf_context", fromlist=["AnonymousCsrfContext"]).AnonymousCsrfContext, __import__("src.auth.tokens", fromlist=["token_digest"]).token_digest(raw_id))
    replacement_id, replacement_csrf = rotate_anonymous_context(db, old)
    db.flush()
    assert old.revoked_at is not None
    assert find_bound_csrf_state(db, raw_id, csrf) is None
    assert find_bound_csrf_state(db, replacement_id, replacement_csrf)[0] == "anonymous"
    db.close()


def test_valid_anonymous_requests_refresh_idle_time_but_not_absolute_expiry(session_factory):
    db = session_factory()
    created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    context, raw_id, csrf = issue_anonymous_context(db, created)
    db.commit()

    active = find_bound_csrf_state(
        db, raw_id, csrf, created + timedelta(minutes=29)
    )
    assert active is not None
    assert active[1].last_seen_at == created + timedelta(minutes=29)
    assert find_bound_csrf_state(
        db, raw_id, csrf, created + timedelta(minutes=58, seconds=59)
    ) is not None
    assert find_bound_csrf_state(
        db, raw_id, csrf, created + timedelta(minutes=88, seconds=58)
    ) is not None
    assert find_bound_csrf_state(
        db, raw_id, csrf, created + timedelta(minutes=118, seconds=58)
    ) is None

    absolute_context, absolute_id, absolute_csrf = issue_anonymous_context(
        db, created
    )
    absolute_context.last_seen_at = created + timedelta(hours=7, minutes=59)
    db.commit()
    assert find_bound_csrf_state(
        db, absolute_id, absolute_csrf, created + timedelta(hours=8)
    ) is None
    assert absolute_context.revoked_at == created + timedelta(hours=8)
    db.close()


def test_invalid_anonymous_token_does_not_refresh_idle_time(session_factory):
    db = session_factory()
    created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    context, raw_id, csrf = issue_anonymous_context(db, created)
    db.commit()
    assert find_bound_csrf_state(
        db, raw_id, "forged", created + timedelta(minutes=29)
    ) is None
    assert context.last_seen_at == created
    assert find_bound_csrf_state(
        db, raw_id, csrf, created + timedelta(minutes=30)
    ) is None
    db.close()


def test_valid_anonymous_bootstrap_reuse_refreshes_idle_time(session_factory):
    from src.auth.csrf import find_active_anonymous_context

    db = session_factory()
    created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    _, raw_id, _ = issue_anonymous_context(db, created)
    db.commit()
    now = created + timedelta(minutes=29)
    reused = find_active_anonymous_context(db, raw_id, now)
    assert reused is not None
    replacement_id, _ = rotate_anonymous_context(db, reused, now)
    replacement = find_active_anonymous_context(
        db, replacement_id, created + timedelta(minutes=58, seconds=59)
    )
    assert replacement is not None
    assert replacement.created_at == created.replace(tzinfo=None)
    assert replacement.last_seen_at == now
    latest_id, _ = rotate_anonymous_context(
        db, replacement, created + timedelta(minutes=58, seconds=59)
    )
    assert find_active_anonymous_context(
        db, latest_id, created + timedelta(hours=8)
    ) is None
    db.close()


def test_logout_and_role_change_revoke_sessions(session_factory):
    db = session_factory()
    user = account()
    db.add(user)
    db.flush()
    row, _, _ = create_authenticated_session(db, user)
    revoke_session(row)
    assert row.revoked_at is not None
    second, _, _ = create_authenticated_session(db, user)
    apply_trusted_role_change(db, user, "producer")
    assert second.revoked_at is not None
    assert revoke_all_sessions(db, user.id) == 0
    db.close()
