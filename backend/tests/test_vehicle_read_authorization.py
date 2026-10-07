import pytest

from src.auth.passwords import hash_password
from src.data.models.account import Account
from src.data.models.vehicle import Vehicle

ORIGIN = "https://testserver"


def login(client, email):
    csrf = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={
        "name": email, "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    })
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": email, "password": "ExamplePass1!"})
    assert response.status_code == 200


def test_list_and_detail_are_limited_to_current_owner(auth_client, session_factory):
    login(auth_client, "owner-a@example.com")
    with session_factory() as db:
        owner = db.query(Account).filter_by(email="owner-a@example.com").one()
        other = Account(id="f" * 32, name="Other", email="owner-b@example.com", email_normalized="owner-b@example.com", password_hash="unused", role="user", status="active")
        db.add(other)
        db.add(Vehicle(id="a" * 32, owner_account_id=owner.id, name="Mine", model="Model A", type="electric", year=2022, range_km=300, mileage_km=100, fuel_type=None))
        db.add(Vehicle(id="b" * 32, owner_account_id=other.id, name="Theirs", model="Model B", type="electric", year=2023, range_km=350, mileage_km=120, fuel_type=None))
        db.commit()

    listed = auth_client.get("/vehicles")
    assert [item["id"] for item in listed.json()["data"]["vehicles"]] == ["a" * 32]
    owned = auth_client.get(f"/vehicles/{'a' * 32}")
    foreign = auth_client.get(f"/vehicles/{'b' * 32}")
    missing = auth_client.get(f"/vehicles/{'c' * 32}")
    assert owned.status_code == 200
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()
    assert foreign.json()["error"]["code"] == "vehicle_not_found"


@pytest.mark.parametrize("role", ["user", "admin", "producer"])
def test_vehicle_reads_are_owner_scoped_for_every_account_role(auth_client, session_factory, role):
    owner_id = ("1" if role == "user" else "2" if role == "admin" else "3") * 32
    other_id = "4" * 32
    with session_factory() as db:
        db.add_all([
            Account(id=owner_id, name="Role owner", email=f"{role}@roles.example", email_normalized=f"{role}@roles.example", password_hash=hash_password("ExamplePass1!"), role=role, status="active", admin_slot="primary" if role == "admin" else None),
            Account(id=other_id, name="Other", email="other@roles.example", email_normalized="other@roles.example", password_hash="unused", role="user", status="active"),
            Vehicle(id="a" * 32, owner_account_id=owner_id, name="Own car", model="Own model", type="electric", year=2022, range_km=300, mileage_km=100, fuel_type=None),
            Vehicle(id="b" * 32, owner_account_id=other_id, name="Other car", model="Other model", type="electric", year=2023, range_km=350, mileage_km=120, fuel_type=None),
        ])
        db.commit()

    csrf = auth_client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    login_response = auth_client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf}, json={"email": f"{role}@roles.example", "password": "ExamplePass1!"})
    assert login_response.status_code == 200

    listed = auth_client.get("/vehicles")
    assert [vehicle["id"] for vehicle in listed.json()["data"]["vehicles"]] == ["a" * 32]
    assert auth_client.get(f"/vehicles/{'a' * 32}").status_code == 200
    assert auth_client.get(f"/vehicles/{'b' * 32}").status_code == 404
