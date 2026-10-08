from uuid import uuid4

from fastapi.testclient import TestClient

from src.trips.settings import TripTestInputs


def request_origin(client: TestClient) -> str:
    return str(client.base_url).rstrip("/")


def create_authenticated_test_account(
    client: TestClient, inputs: TripTestInputs
) -> tuple[str, str]:
    origin = request_origin(client)
    email_prefix, email_domain = inputs.account_email.rsplit("@", 1)
    email = f"{email_prefix}+{uuid4().hex}@{email_domain}"
    bootstrap = client.post("/auth/csrf/bootstrap", headers={"Origin": origin})
    assert bootstrap.status_code == 200
    anonymous_token = bootstrap.json()["data"]["csrf_token"]

    registration = client.post(
        "/auth/register",
        headers={"Origin": origin, "X-CSRF-Token": anonymous_token},
        json={
            "name": inputs.account_name,
            "email": email,
            "password": inputs.account_password,
            "password_confirmation": inputs.account_password,
        },
    )
    assert registration.status_code == 201, registration.text

    login = client.post(
        "/auth/login",
        headers={"Origin": origin, "X-CSRF-Token": anonymous_token},
        json={"email": email, "password": inputs.account_password},
    )
    assert login.status_code == 200, login.text
    return email, login.json()["data"]["csrf_token"]


def create_test_vehicle(
    client: TestClient,
    inputs: TripTestInputs,
    csrf_token: str,
    *,
    range_km: int | None = None,
    vehicle_type: str | None = None,
) -> dict[str, object]:
    selected_type = vehicle_type or inputs.vehicle_type
    response = client.post(
        "/vehicles",
        headers={
            "Origin": request_origin(client),
            "X-CSRF-Token": csrf_token,
        },
        json={
            "name": inputs.vehicle_name,
            "model": inputs.vehicle_model,
            "brand": "Test Brand",
            "type": selected_type,
            "year": inputs.vehicle_year,
            "range_km": range_km if range_km is not None else inputs.vehicle_range_km,
            "mileage_km": inputs.vehicle_mileage_km,
            "fuel_type": inputs.fuel_type if selected_type == "combustion" else None,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["vehicle"]


def select_live_place(client: TestClient, query: str) -> dict[str, object]:
    response = client.get("/trips/places", params={"q": query})
    assert response.status_code == 200, response.text
    places = response.json()["data"]["places"]
    assert places, "Configured live place query returned no suggestions"
    return places[0]
