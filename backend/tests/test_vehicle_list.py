from datetime import datetime, timezone

from src.data.models.vehicle import Vehicle


ORIGIN = "https://testserver"


def authenticated(client, email):
    token = client.post("/auth/csrf/bootstrap", headers={"Origin": ORIGIN}).json()["data"]["csrf_token"]
    registered = client.post(
        "/auth/register",
        headers={"Origin": ORIGIN, "X-CSRF-Token": token},
        json={"name": "Garage Owner", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!"},
    )
    assert registered.status_code == 201
    login = client.post(
        "/auth/login",
        headers={"Origin": ORIGIN, "X-CSRF-Token": token},
        json={"email": email, "password": "ExamplePass1!"},
    )
    assert login.status_code == 200
    return login.json()["data"]["csrf_token"]


def test_vehicle_list_returns_empty_collection_for_new_owner(auth_client):
    authenticated(auth_client, "empty@example.com")
    response = auth_client.get("/vehicles")

    assert response.status_code == 200
    assert response.json() == {"data": {"vehicles": []}}


def test_vehicle_list_returns_owner_records_in_stable_order(auth_client, session_factory):
    authenticated(auth_client, "list@example.com")
    with session_factory() as db:
        from src.data.models.account import Account

        owner = db.query(Account).filter_by(email="list@example.com").one()
        created_at = datetime.now(timezone.utc)
        db.add_all(
            [
                Vehicle(id="b" * 32, owner_account_id=owner.id, name="Second", model="Model B", type="electric", year=2024, range_km=400, mileage_km=200, fuel_type=None, created_at=created_at),
                Vehicle(id="a" * 32, owner_account_id=owner.id, name="First", model="Model A", type="combustion", year=2020, range_km=600, mileage_km=100, fuel_type="petrol", created_at=created_at),
            ]
        )
        db.commit()
    response = auth_client.get("/vehicles")

    assert response.status_code == 200
    vehicles = response.json()["data"]["vehicles"]
    assert [vehicle["id"] for vehicle in vehicles] == ["a" * 32, "b" * 32]
    assert vehicles[0]["fuel_type"] == "petrol"
    assert "owner_account_id" not in vehicles[0]
    assert vehicles[0]["created_at"].endswith("Z")


def test_vehicle_list_requires_an_active_session(auth_client):
    response = auth_client.get("/vehicles")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_vehicle_item_route_rejects_malformed_identifiers(auth_client):
    authenticated(auth_client, "bad-id@example.com")
    response = auth_client.get("/vehicles/not-an-opaque-id")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_vehicle_openapi_documents_contract_and_protected_operations(auth_client):
    schema = auth_client.app.openapi()
    assert schema["openapi"] == "3.1.0"
    operation = schema["paths"]["/vehicles"]["get"]
    assert "200" in operation["responses"]
    assert {"401", "403", "404", "405", "422", "500"}.issubset(operation["responses"])
    assert "/vehicles/{vehicle_id}" in schema["paths"]
