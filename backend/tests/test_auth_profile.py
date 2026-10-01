from src.auth.passwords import hash_password
from src.data.models.account import Account

ORIGIN = "https://testserver"


def logged_in(client, factory):
    db = factory()
    user = Account(id="b" * 32, name="Alex Driver", email="alex@example.com", email_normalized="alex@example.com", password_hash=hash_password("ExamplePass1!"), role="user", status="active")
    db.add(user)
    db.commit()
    db.close()
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": "alex@example.com", "password": "ExamplePass1!"})
    assert response.status_code == 200
    return response.json()["data"]["csrf_token"]


def test_profile_update_and_email_requires_current_password(auth_client, session_factory):
    csrf = logged_in(auth_client, session_factory)
    result = auth_client.patch("/auth/me", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"name": "Alex Updated"})
    assert result.status_code == 200 and result.json()["data"]["name"] == "Alex Updated"
    missing = auth_client.patch("/auth/me", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "new@example.com"})
    assert missing.status_code == 403
    changed = auth_client.patch("/auth/me", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "New@example.com", "current_password": "ExamplePass1!"})
    assert changed.status_code == 200
    assert changed.json()["data"]["email"] == "New@example.com"
    assert changed.json()["data"]["email_verified"] is False


def test_duplicate_profile_email_is_generic_and_updates_are_atomic(auth_client, session_factory):
    csrf = logged_in(auth_client, session_factory)
    with session_factory() as db:
        db.add(Account(id="e" * 32, name="Other", email="other@example.com", email_normalized="other@example.com", password_hash=hash_password("ExamplePass1!"), role="user", status="active"))
        db.commit()
    response = auth_client.patch("/auth/me", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"name": "Should Not Persist", "email": " OTHER@example.com ", "current_password": "ExamplePass1!"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_unavailable"
    assert auth_client.get("/auth/me").json()["data"]["name"] == "Alex Driver"


def test_password_change_deactivates_and_revokes_sessions(auth_client, session_factory):
    csrf = logged_in(auth_client, session_factory)
    result = auth_client.post("/auth/me/password", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"current_password": "ExamplePass1!", "new_password": "OtherPass2!", "new_password_confirmation": "OtherPass2!"})
    assert result.status_code == 200
    assert auth_client.get("/auth/me").status_code == 401


def test_role_cannot_be_changed_by_profile_payload(auth_client, session_factory):
    csrf = logged_in(auth_client, session_factory)
    response = auth_client.patch("/auth/me", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"name": "Alex", "role": "admin"})
    assert response.status_code == 422
