import pytest
from fastapi.testclient import TestClient
from src.auth.passwords import hash_password
from src.data.models.account import Account
from src.data.models.vehicle import Vehicle
from src.auth.sessions import apply_trusted_role_change

ORIGIN = "https://testserver"


def make_account(db, role, email):
    account = Account(id=("a" if role == "admin" else "u" if role == "user" else "p") * 32, name="Example", email=email, email_normalized=email.casefold(), password_hash=hash_password("ExamplePass1!"), role=role, status="active", admin_slot="primary" if role == "admin" else None)
    db.add(account)
    db.commit()
    return account


def login(client, email):
    csrf = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": email, "password": "ExamplePass1!"})
    assert response.status_code == 200
    return response.json()["data"]["csrf_token"]


@pytest.mark.parametrize("role", ["user", "producer"])
def test_non_admin_roles_cannot_read_admin_data(auth_client, session_factory, role):
    with session_factory() as db:
        make_account(db, role, f"{role}@example.com")
    login(auth_client, f"{role}@example.com")
    assert auth_client.get("/admin/users").status_code == 403
    assert auth_client.get("/admin/vehicles").status_code == 403
    assert auth_client.get("/admin/producers").status_code == 403


def test_unauthenticated_caller_cannot_read_admin_data(auth_client):
    assert auth_client.get("/admin/users").status_code == 401
    assert auth_client.get("/admin/vehicles").status_code == 401
    assert auth_client.get("/admin/producers").status_code == 401


def test_admin_can_page_users_and_add_producer_without_returning_password(auth_client, session_factory):
    with session_factory() as db:
        make_account(db, "admin", "admin@example.com")
        make_account(db, "user", "user@example.com")
    csrf = login(auth_client, "admin@example.com")
    result = auth_client.get("/admin/users?page=1&page_size=1")
    assert result.status_code == 200
    assert result.json()["data"]["pagination"]["total"] == 1
    assert "brand" not in result.json()["data"]["users"][0]
    created = auth_client.post("/admin/producers", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"name": "Dealer", "brand": "Dacia", "email": "dealer@example.com", "password": "ExamplePass1!"})
    assert created.status_code == 201
    assert "password" not in str(created.json())
    listed = auth_client.get("/admin/producers?brand=Da&page_size=1&sort_by=brand")
    assert listed.status_code == 200
    assert listed.json()["data"]["producers"][0]["brand"] == "Dacia"
    assert "password" not in str(listed.json())
    assert listed.json()["data"]["stats"]["by_brand"] == [{"brand": "Dacia", "count": 1}]
    assert auth_client.post("/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}).status_code == 200
    csrf = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    assert auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": "dealer@example.com", "password": "ExamplePass1!"}).status_code == 200


def test_producer_create_requires_csrf_and_rejects_duplicate_email(auth_client, session_factory):
    with session_factory() as db:
        make_account(db, "admin", "admin@example.com")
    csrf = login(auth_client, "admin@example.com")
    payload = {"name": "Dealer", "brand": "Dacia", "email": "dealer@example.com", "password": "ExamplePass1!"}
    assert auth_client.post("/admin/producers", headers={"Origin": ORIGIN}, json=payload).status_code == 403
    assert auth_client.post("/admin/producers", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json=payload).status_code == 201
    duplicate = auth_client.post("/admin/producers", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={**payload, "brand": "Ford"})
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_unavailable"


def test_user_deactivation_requires_confirmation_and_revokes_sessions(auth_client, session_factory):
    with session_factory() as db:
        user = make_account(db, "user", "target@example.com")
        make_account(db, "admin", "admin@example.com")
    with TestClient(auth_client.app, base_url=ORIGIN) as user_client, TestClient(auth_client.app, base_url=ORIGIN) as admin_client:
        login(user_client, "target@example.com")
        admin_csrf = login(admin_client, "admin@example.com")
        invalid = admin_client.request("DELETE", f"/admin/users/{user.id}", headers={"Origin": ORIGIN, "X-CSRF-Token": admin_csrf}, json={"confirmation": "NO"})
        assert invalid.status_code == 422
        deleted = admin_client.request("DELETE", f"/admin/users/{user.id}", headers={"Origin": ORIGIN, "X-CSRF-Token": admin_csrf}, json={"confirmation": "DELETE"})
        assert deleted.status_code == 200
        user_stats = admin_client.get("/admin/users").json()["data"]["stats"]
        assert user_stats["by_status"]["disabled"] == 1
        assert user_client.get("/auth/me").status_code == 401
    with session_factory() as db:
        assert db.get(Account, user.id).status == "disabled"


def test_admin_vehicle_list_is_global_read_only_and_hides_owner(auth_client, session_factory):
    with session_factory() as db:
        admin = make_account(db, "admin", "admin@example.com")
        owner = make_account(db, "user", "owner@example.com")
        db.add(Vehicle(id="b" * 32, owner_account_id=owner.id, name="Shared", model="Model X", type="electric", year=2024, range_km=400, mileage_km=20, fuel_type=None))
        db.commit()
    login(auth_client, "admin@example.com")
    result = auth_client.get("/admin/vehicles?page_size=10")
    assert result.status_code == 200
    assert result.json()["data"]["vehicles"][0]["name"] == "Shared"
    assert result.json()["data"]["stats"]["by_type"]["electric"] == 1
    assert "owner_account_id" not in result.json()["data"]["vehicles"][0]
    assert auth_client.post("/admin/vehicles", json={}).status_code == 405


def test_trusted_role_changes_preserve_the_single_admin_slot(session_factory):
    with session_factory() as db:
        first = make_account(db, "user", "first@example.com")
        apply_trusted_role_change(db, first, "admin")
        assert first.admin_slot == "primary"
        second = make_account(db, "producer", "second@example.com")
        with pytest.raises(ValueError, match="already provisioned"):
            apply_trusted_role_change(db, second, "admin")
        apply_trusted_role_change(db, first, "user")
        assert first.admin_slot is None
        apply_trusted_role_change(db, second, "admin")
        assert second.admin_slot == "primary"
