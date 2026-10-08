from datetime import datetime, timezone

from src.data.models.account import Account
from src.data.models.vehicle import Vehicle


ORIGIN = "https://testserver"


def login(client, email):
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    client.post("/auth/register", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={
        "name": "Brand Test", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!",
    }).raise_for_status()
    response = client.post("/auth/login", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={"email": email, "password": "ExamplePass1!"})
    return response.json()["data"]["csrf_token"]


def test_vehicle_creation_requires_and_trims_brand(auth_client):
    token = login(auth_client, "brand-required@example.com")
    payload = {"name": "Daily", "model": "M3", "type": "electric", "year": 2024, "range_km": 400, "mileage_km": 1, "fuel_type": None}
    missing = auth_client.post("/vehicles", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json=payload)
    assert missing.status_code == 422
    created = auth_client.post("/vehicles", headers={"Origin": ORIGIN, "X-CSRF-Token": token}, json={**payload, "brand": "  Tesla  "})
    assert created.status_code == 201
    assert created.json()["data"]["vehicle"]["brand"] == "Tesla"


def test_archived_vehicle_is_hidden_from_owner_but_retained_for_history(auth_client, session_factory):
    token = login(auth_client, "archive-owner@example.com")
    with session_factory() as db:
        owner = db.query(Account).filter_by(email="archive-owner@example.com").one()
        db.add(Vehicle(id="a" * 32, owner_account_id=owner.id, name="Mine", model="M3", brand="Tesla", type="electric", year=2024, range_km=400, mileage_km=10, fuel_type=None))
        db.commit()
    headers = {"Origin": ORIGIN, "X-CSRF-Token": token}
    assert auth_client.delete(f"/vehicles/{'a' * 32}", headers=headers).status_code == 200
    assert auth_client.get(f"/vehicles/{'a' * 32}").status_code == 404
    assert auth_client.get(f"/vehicles/{'a' * 32}/image-content").status_code == 404
    with session_factory() as db:
        archived = db.get(Vehicle, "a" * 32)
        assert archived is not None
        assert archived.brand == "Tesla"
        assert isinstance(archived.archived_at, datetime)
        assert archived.archived_at.tzinfo is None or archived.archived_at.tzinfo == timezone.utc
