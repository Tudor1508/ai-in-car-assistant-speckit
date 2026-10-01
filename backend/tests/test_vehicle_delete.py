from src.data.models.account import Account
from src.data.models.vehicle import Vehicle

ORIGIN = "https://testserver"


def logged_in(client, email):
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={
        "name": email, "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    })
    login = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    return login.json()["data"]["csrf_token"]


def test_delete_removes_only_owned_vehicle_and_returns_status(auth_client, session_factory):
    csrf = logged_in(auth_client, "delete-owner@example.com")
    with session_factory() as db:
        owner = db.query(Account).filter_by(email="delete-owner@example.com").one()
        other = Account(id="e" * 32, name="Other", email="other-owner@example.com", email_normalized="other-owner@example.com", password_hash="unused", role="user", status="active")
        db.add(other)
        db.add_all([
            Vehicle(id="a" * 32, owner_account_id=owner.id, name="Mine", model="M1", type="electric", year=2022, range_km=100, mileage_km=20, fuel_type=None),
            Vehicle(id="b" * 32, owner_account_id=other.id, name="Theirs", model="M2", type="electric", year=2022, range_km=100, mileage_km=20, fuel_type=None),
        ])
        db.commit()

    deleted = auth_client.delete(f"/vehicles/{'a' * 32}", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf})
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"status": "deleted"}}
    assert auth_client.get("/vehicles").json()["data"]["vehicles"] == []
    foreign = auth_client.delete(f"/vehicles/{'b' * 32}", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf})
    missing = auth_client.delete(f"/vehicles/{'c' * 32}", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf})
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()
    with session_factory() as db:
        assert db.get(Vehicle, "b" * 32) is not None
