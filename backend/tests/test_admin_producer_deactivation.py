from fastapi.testclient import TestClient
from sqlalchemy import select

from src.auth.passwords import hash_password
from src.data.models.account import Account
from src.data.models.auth_session import AuthSession
from src.data.models.trip_favorite import TripFavorite
from src.data.models.vehicle import Vehicle

ORIGIN = "https://testserver"


def account(db, role: str, account_id: str, email: str) -> Account:
    value = Account(
        id=account_id, name="Example", email=email, email_normalized=email.casefold(),
        password_hash=hash_password("ExamplePass1!"), role=role, status="active",
        admin_slot="primary" if role == "admin" else None,
        brand="Example" if role == "producer" else None,
    )
    db.add(value)
    db.commit()
    return value


def login(client: TestClient, email: str) -> str:
    csrf = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": email, "password": "ExamplePass1!"})
    assert response.status_code == 200
    return response.json()["data"]["csrf_token"]


def test_producer_deactivation_requires_admin_and_csrf(auth_client: TestClient, session_factory) -> None:
    with session_factory() as db:
        account(db, "producer", "p" * 32, "producer@example.test")
        account(db, "admin", "a" * 32, "admin@example.test")
        account(db, "user", "u" * 32, "user@example.test")

    assert auth_client.request("DELETE", f"/admin/producers/{'p' * 32}", json={"confirmation": "DELETE"}).status_code == 401
    with TestClient(auth_client.app, base_url=ORIGIN) as producer_client, TestClient(auth_client.app, base_url=ORIGIN) as user_client, TestClient(auth_client.app, base_url=ORIGIN) as admin_client:
        producer_csrf = login(producer_client, "producer@example.test")
        user_csrf = login(user_client, "user@example.test")
        admin_csrf = login(admin_client, "admin@example.test")
        payload = {"confirmation": "DELETE"}
        headers = {"Origin": ORIGIN, "X-CSRF-Token": admin_csrf}
        assert producer_client.request("DELETE", f"/admin/producers/{'p' * 32}", headers={"Origin": ORIGIN, "X-CSRF-Token": producer_csrf}, json=payload).status_code == 403
        assert user_client.request("DELETE", f"/admin/producers/{'p' * 32}", headers={"Origin": ORIGIN, "X-CSRF-Token": user_csrf}, json=payload).status_code == 403
        no_csrf = admin_client.request("DELETE", f"/admin/producers/{'p' * 32}", headers={"Origin": ORIGIN}, json=payload)
        assert no_csrf.status_code == 403
        assert no_csrf.json()["error"]["code"] == "invalid_csrf"
        invalid_confirmation = admin_client.request("DELETE", f"/admin/producers/{'p' * 32}", headers=headers, json={"confirmation": "NO"})
        assert invalid_confirmation.status_code == 422


def test_admin_deactivation_disables_producer_revokes_sessions_and_preserves_owned_records(auth_client: TestClient, session_factory) -> None:
    with session_factory() as db:
        producer = account(db, "producer", "p" * 32, "producer@example.test")
        account(db, "admin", "a" * 32, "admin@example.test")
        db.add(Vehicle(id="v" * 32, owner_account_id=producer.id, name="Car", model="Model", type="electric", year=2022, range_km=350, mileage_km=10000, fuel_type=None))
        db.add(TripFavorite(id="f" * 32, owner_account_id=producer.id, origin_label="Origin", origin_latitude=46, origin_longitude=23, destination_label="Destination", destination_latitude=47, destination_longitude=24))
        db.commit()

    with TestClient(auth_client.app, base_url=ORIGIN) as producer_client, TestClient(auth_client.app, base_url=ORIGIN) as admin_client:
        login(producer_client, "producer@example.test")
        admin_csrf = login(admin_client, "admin@example.test")
        headers = {"Origin": ORIGIN, "X-CSRF-Token": admin_csrf}
        result = admin_client.request("DELETE", f"/admin/producers/{producer.id}", headers=headers, json={"confirmation": "DELETE"})
        assert result.status_code == 200
        assert result.json() == {"data": {"status": "disabled"}}
        assert producer_client.get("/auth/me").status_code == 401

        repeated = admin_client.request("DELETE", f"/admin/producers/{producer.id}", headers=headers, json={"confirmation": "DELETE"})
        assert repeated.status_code == 200
        assert admin_client.get("/admin/producers").json()["data"]["stats"]["total"] == 1
        listed = admin_client.get("/admin/producers?status=disabled")
        assert listed.status_code == 200
        assert listed.json()["data"]["producers"][0]["id"] == producer.id

    with session_factory() as db:
        assert db.get(Account, producer.id).status == "disabled"
        assert db.get(Vehicle, "v" * 32) is not None
        assert db.get(TripFavorite, "f" * 32) is not None
        sessions = db.scalars(select(AuthSession).where(AuthSession.account_id == producer.id)).all()
        assert sessions and all(session.revoked_at is not None for session in sessions)


def test_producer_deactivation_hides_wrong_role_and_missing_ids(auth_client: TestClient, session_factory) -> None:
    with session_factory() as db:
        account(db, "admin", "a" * 32, "admin@example.test")
        account(db, "user", "u" * 32, "user@example.test")
    csrf = login(auth_client, "admin@example.test")
    headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
    wrong_role = auth_client.request("DELETE", f"/admin/producers/{'u' * 32}", headers=headers, json={"confirmation": "DELETE"})
    missing = auth_client.request("DELETE", f"/admin/producers/{'f' * 32}", headers=headers, json={"confirmation": "DELETE"})
    assert wrong_role.status_code == missing.status_code == 404
    assert wrong_role.json() == missing.json()
    assert wrong_role.json()["error"]["code"] == missing.json()["error"]["code"]
    assert producer_id_not_disclosed("u" * 32, wrong_role.text)


def producer_id_not_disclosed(value: str, response: str) -> bool:
    return value not in response
