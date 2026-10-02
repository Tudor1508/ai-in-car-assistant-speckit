import os
from uuid import uuid4

from fastapi.testclient import TestClient

from src.trips.settings import TripTestInputs
from tests.trip_test_support import create_authenticated_test_account


def _authenticate_validation_account(client: TestClient) -> None:
    origin = str(client.base_url).rstrip("/")
    email = f"place-validation-{uuid4().hex}@example.com"
    password = "ValidationPass1!"
    bootstrap = client.post("/auth/csrf/bootstrap", headers={"Origin": origin})
    assert bootstrap.status_code == 200
    csrf_token = bootstrap.json()["data"]["csrf_token"]

    registration = client.post(
        "/auth/register",
        headers={"Origin": origin, "X-CSRF-Token": csrf_token},
        json={
            "name": "Place validation",
            "email": email,
            "password": password,
            "password_confirmation": password,
        },
    )
    assert registration.status_code == 201, registration.text

    login = client.post(
        "/auth/login",
        headers={"Origin": origin, "X-CSRF-Token": csrf_token},
        json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text


def test_trip_place_search_requires_an_active_session(auth_client: TestClient) -> None:
    response = auth_client.get("/trips/places", params={"q": ""})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_trip_place_search_rejects_blank_query_for_authenticated_account(
    auth_client: TestClient,
) -> None:
    _authenticate_validation_account(auth_client)

    response = auth_client.get("/trips/places", params={"q": "   "})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_trip_place_search_rejects_query_longer_than_contract_limit(
    auth_client: TestClient,
) -> None:
    _authenticate_validation_account(auth_client)

    response = auth_client.get("/trips/places", params={"q": "x" * 256})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_trip_place_search_returns_live_ors_suggestions(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    create_authenticated_test_account(auth_client, inputs)

    response = auth_client.get("/trips/places", params={"q": inputs.origin_query})

    assert response.status_code == 200, response.text
    places = response.json()["data"]["places"]
    assert places
    for place in places:
        assert place["label"]
        assert -90 <= place["latitude"] <= 90
        assert -180 <= place["longitude"] <= 180


def test_trip_place_search_returns_no_results_for_configured_unresolved_query(
    auth_client: TestClient,
) -> None:
    inputs = TripTestInputs.from_environment()
    create_authenticated_test_account(auth_client, inputs)

    response = auth_client.get("/trips/places", params={"q": inputs.unresolved_query})

    assert response.status_code == 200, response.text
    assert response.json()["data"]["places"] == []


def test_trip_place_search_maps_live_provider_auth_error_safely(
    auth_client: TestClient, monkeypatch
) -> None:
    inputs = TripTestInputs.from_environment()
    create_authenticated_test_account(auth_client, inputs)
    configured_key = os.environ["OPENROUTESERVICE_API_KEY"]
    # Derive a rejected credential from local configuration; never print or persist it.
    rejected_key = f"{configured_key}invalid"
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", rejected_key)

    response = auth_client.get("/trips/places", params={"q": inputs.origin_query})

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "routing_provider_unavailable"
    assert configured_key not in response.text
    assert rejected_key not in response.text
