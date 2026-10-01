import pytest
from src.auth.passwords import hash_password
from src.data.models.account import Account

ORIGIN = "https://testserver"


@pytest.mark.parametrize("role", ["user", "admin", "producer"])
def test_every_assigned_role_has_self_service_only(auth_client, session_factory, role):
    db = session_factory()
    user = Account(id="c" * 32, name="Role User", email=f"{role}@example.com", email_normalized=f"{role}@example.com", password_hash=hash_password("ExamplePass1!"), role=role, status="active")
    other = Account(id="d" * 32, name="Other User", email="other@example.com", email_normalized="other@example.com", password_hash=hash_password("ExamplePass1!"), role="user", status="active")
    db.add_all([user, other]); db.commit(); db.close()
    token = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    login = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": f"{role}@example.com", "password": "ExamplePass1!"})
    assert login.status_code == 200
    assert auth_client.get("/auth/me").json()["data"]["role"] == role
    response = auth_client.get(f"/auth/accounts/{other.id}")
    assert response.status_code == 404
    denied = auth_client.patch(f"/auth/accounts/{other.id}", headers={"Origin": ORIGIN, "X-CSRF-Token": login.json()["data"]["csrf_token"]}, json={"name": "Changed"})
    assert denied.status_code in (404, 405)


def test_visitor_and_logout_are_denied(auth_client):
    assert auth_client.get("/auth/me").status_code == 401
    token = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    logout = auth_client.post("/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": token})
    assert logout.status_code == 401
