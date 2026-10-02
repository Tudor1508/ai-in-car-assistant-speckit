from fastapi.testclient import TestClient

from src.trips.settings import TripTestInputs
from tests.trip_test_support import create_authenticated_test_account, select_live_place


def live_pair(client: TestClient, inputs: TripTestInputs) -> tuple[dict[str, object], dict[str, object]]:
    return (
        select_live_place(client, inputs.origin_query),
        select_live_place(client, inputs.destination_query),
    )


def test_trip_favorites_require_an_active_session(auth_client: TestClient) -> None:
    assert auth_client.get("/trips/favorites").status_code == 401


def test_trip_favorite_create_is_csrf_protected(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf = create_authenticated_test_account(auth_client, inputs)
    origin, destination = live_pair(auth_client, inputs)

    response = auth_client.post(
        "/trips/favorites",
        headers={"Origin": str(auth_client.base_url).rstrip("/")},
        json={"origin": origin, "destination": destination},
    )

    assert csrf
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "invalid_csrf"


def test_trip_favorite_is_persistent_private_and_idempotent(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf = create_authenticated_test_account(auth_client, inputs)
    origin, destination = live_pair(auth_client, inputs)
    headers = {
        "Origin": str(auth_client.base_url).rstrip("/"),
        "X-CSRF-Token": csrf,
    }
    payload = {"origin": origin, "destination": destination}

    created = auth_client.post("/trips/favorites", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    favorite = created.json()["data"]["favorite"]
    assert set(favorite) == {"id", "origin", "destination", "created_at"}
    assert "provider_id" not in favorite["origin"]
    assert "owner_account_id" not in favorite

    normalized_payload = {
        "origin": {
            **origin,
            "latitude": round(float(origin["latitude"]), 6) + 0.0000001,
            "longitude": round(float(origin["longitude"]), 6) - 0.0000001,
        },
        "destination": {
            **destination,
            "latitude": round(float(destination["latitude"]), 6) + 0.0000001,
            "longitude": round(float(destination["longitude"]), 6) - 0.0000001,
        },
    }
    duplicate = auth_client.post("/trips/favorites", headers=headers, json=normalized_payload)
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["data"]["favorite"]["id"] == favorite["id"]

    listed = auth_client.get("/trips/favorites")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["data"]["favorites"]] == [favorite["id"]]

    other_client = TestClient(auth_client.app, base_url=str(auth_client.base_url))
    try:
        create_authenticated_test_account(other_client, inputs)
        other_list = other_client.get("/trips/favorites")
        assert other_list.status_code == 200
        assert other_list.json()["data"]["favorites"] == []
    finally:
        other_client.close()
