from src.data.models.account import Account
from src.auth.passwords import hash_password


ORIGIN = "https://testserver"


def bootstrap(client):
    response = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert response.status_code == 200
    return response.json()["data"]["csrf_token"]


def register(client, csrf):
    return client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={
        "name": "Alex Driver", "email": "alex@example.com", "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!"
    })


def test_bootstrap_cookie_attributes_and_anonymous_rotation(auth_client):
    first = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert first.status_code == 200
    cookie = first.headers["set-cookie"]
    assert "__Host-dw_session=" in cookie and "Secure" in cookie and "HttpOnly" in cookie
    assert "SameSite=lax" in cookie and "Path=/" in cookie and "Domain=" not in cookie
    first_id = auth_client.cookies.get("__Host-dw_session")
    first_token = first.json()["data"]["csrf_token"]
    second = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert second.status_code == 200
    assert auth_client.cookies.get("__Host-dw_session") != first_id
    assert second.json()["data"]["csrf_token"] != first_token


def test_login_rotates_anonymous_identifier_and_csrf(auth_client, session_factory):
    csrf = bootstrap(auth_client)
    assert register(auth_client, csrf).status_code == 201
    anon_id = auth_client.cookies.get("__Host-dw_session")
    response = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "alex@example.com", "password": "ExamplePass1!"})
    assert response.status_code == 200
    assert auth_client.cookies.get("__Host-dw_session") != anon_id
    assert response.json()["data"]["csrf_token"]
    assert response.json()["data"]["account"]["email_verified"] is False
    assert auth_client.get("/auth/me").status_code == 200


def test_login_requires_origin_and_csrf_and_errors_are_generic(auth_client):
    no_origin = auth_client.post("/auth/csrf/bootstrap")
    assert no_origin.status_code == 403
    csrf = bootstrap(auth_client)
    wrong = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": "wrong"}, json={"email": "x@example.com", "password": "not"})
    assert wrong.status_code == 403
    bad_origin = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": "https://attacker.invalid"})
    assert bad_origin.status_code == 403
    failed = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "missing@example.com", "password": "WrongPass1!"})
    assert failed.status_code == 401
    assert failed.json()["error"]["code"] == "invalid_credentials"
    assert "missing@example.com" not in failed.text


def test_authenticated_bootstrap_rotates_only_csrf_and_logout_revokes_session(auth_client, session_factory):
    csrf = bootstrap(auth_client)
    assert register(auth_client, csrf).status_code == 201
    response = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "alex@example.com", "password": "ExamplePass1!"})
    assert response.status_code == 200
    session_id = auth_client.cookies.get("__Host-dw_session")
    authenticated_csrf = response.json()["data"]["csrf_token"]
    rotated = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert rotated.status_code == 200
    assert auth_client.cookies.get("__Host-dw_session") == session_id
    assert rotated.json()["data"]["csrf_token"] != authenticated_csrf
    with session_factory() as db:
        from src.auth.csrf import find_bound_csrf_state
        assert find_bound_csrf_state(db, session_id, authenticated_csrf) is None
    new_csrf = rotated.json()["data"]["csrf_token"]
    logout = auth_client.post("/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": new_csrf})
    assert logout.status_code == 200
    assert "Max-Age=0" in logout.headers["set-cookie"]
    assert auth_client.get("/auth/me").status_code == 401
    auth_client.cookies.set("__Host-dw_session", session_id, domain="testserver", path="/")
    replay = auth_client.post("/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": new_csrf})
    assert replay.status_code == 401


def test_authenticated_bootstrap_refreshes_idle_activity_but_respects_absolute_limit(
    auth_client, session_factory, monkeypatch
):
    from datetime import timedelta
    from src.auth import routes
    from src.auth import sessions
    from src.auth.sessions import utc_now
    from src.auth.tokens import token_digest
    from src.data.models.auth_session import AuthSession

    csrf = bootstrap(auth_client)
    assert register(auth_client, csrf).status_code == 201
    login = auth_client.post(
        "/auth/login",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={"email": "alex@example.com", "password": "ExamplePass1!"},
    )
    assert login.status_code == 200
    session_id = auth_client.cookies.get("__Host-dw_session")
    now = utc_now()
    with session_factory() as db:
        session = db.get(AuthSession, token_digest(session_id))
        assert session is not None
        session.created_at = now - timedelta(minutes=31)
        session.last_seen_at = now - timedelta(minutes=29)
        db.commit()

    bootstrap_time = now
    monkeypatch.setattr(routes, "utc_now", lambda: bootstrap_time)
    monkeypatch.setattr(sessions, "utc_now", lambda: bootstrap_time)
    refreshed = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert refreshed.status_code == 200
    with session_factory() as db:
        session = db.get(AuthSession, token_digest(session_id))
        assert session is not None
        assert session.last_seen_at == bootstrap_time.replace(tzinfo=None)
        session.created_at = bootstrap_time - timedelta(hours=8)
        session.last_seen_at = bootstrap_time - timedelta(minutes=1)
        db.commit()

    monkeypatch.setattr(routes, "utc_now", lambda: bootstrap_time + timedelta(hours=8))
    monkeypatch.setattr(
        sessions, "utc_now", lambda: bootstrap_time + timedelta(hours=8)
    )
    expired = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN})
    assert expired.status_code == 200
    assert auth_client.get("/auth/me").status_code == 401


def test_auth_openapi_exposes_bootstrap_and_safe_error_envelopes(auth_client):
    schema = auth_client.app.openapi()
    assert schema["openapi"] == "3.1.0"
    operation = schema["paths"]["/auth/csrf/bootstrap"]["post"]
    assert operation["responses"]["200"]["content"]["application/json"]["schema"]
    assert {"403", "404", "405", "422", "500"}.issubset(operation["responses"])
    assert "/auth/accounts/{account_id}" not in schema["paths"]
