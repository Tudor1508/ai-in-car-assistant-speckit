from fastapi.testclient import TestClient

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import update

from src.data.models.trip_history import TripHistory


def payload(vehicle_id: str, distance: int = 12000) -> dict:
    return {
        "origin": {"label": "Origin", "latitude": 46.77, "longitude": 23.59},
        "destination": {"label": "Destination", "latitude": 45.75, "longitude": 21.23},
        "vehicle_id": vehicle_id,
        "current_level_percent": 80,
        "route_preference": "fastest",
        "route": {"geometry": {"type": "LineString", "coordinates": [[23.59, 46.77], [21.23, 45.75]]}, "distance_m": distance, "duration_s": 900},
        "feasibility": {"status": "complete", "message": None},
        "legs": [{"sequence": 1, "distance_m": distance, "duration_s": 900}],
        "stops": [], "attractions": [], "restaurants": [],
    }


def create_user_and_vehicle(client: TestClient):
    origin = str(client.base_url).rstrip("/")
    bootstrap = client.post("/auth/csrf/bootstrap", headers={"Origin": origin}).json()["data"]["csrf_token"]
    email = f"history-{uuid4().hex}@example.com"
    credentials = {"name": "History Test", "email": email, "password": "ExamplePass1!", "password_confirmation": "ExamplePass1!"}
    client.post("/auth/register", headers={"Origin": origin, "X-CSRF-Token": bootstrap}, json=credentials).raise_for_status()
    login = client.post("/auth/login", headers={"Origin": origin, "X-CSRF-Token": bootstrap}, json={"email": email, "password": credentials["password"]})
    csrf = login.json()["data"]["csrf_token"]
    vehicle_response = client.post("/vehicles", headers={"Origin": origin, "X-CSRF-Token": csrf}, json={
        "name": "History Car", "model": "Test", "brand": "Test Brand", "type": "electric", "year": 2024,
        "range_km": 400, "mileage_km": 12000, "fuel_type": None,
    })
    assert vehicle_response.status_code == 201, vehicle_response.text
    return csrf, vehicle_response.json()["data"]["vehicle"]


def test_history_save_list_and_owner_isolation(auth_client: TestClient):
    csrf, vehicle = create_user_and_vehicle(auth_client)
    headers = {"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf}
    first = auth_client.post("/trips/history", headers=headers, json=payload(vehicle["id"]))
    assert first.status_code == 201, first.text
    saved = first.json()["data"]["trip"]
    assert saved["route"]["geometry"]["coordinates"] == [[23.59, 46.77], [21.23, 45.75]]
    assert "owner_account_id" not in saved
    incomplete = payload(vehicle["id"], 18000)
    incomplete["feasibility"] = {"status": "incomplete", "message": "Out of range"}
    second = auth_client.post("/trips/history", headers=headers, json=incomplete)
    assert second.status_code == 201
    listed = auth_client.get("/trips/history?page_size=1")
    data = listed.json()["data"]
    assert len(data["trips"]) == 1
    assert data["pagination"] == {"page": 1, "page_size": 1, "total": 2, "total_pages": 2}
    assert data["summary"] == {"total_trips": 2, "total_distance_m": 30000, "total_duration_s": 1800}
    assert data["trips"][0]["id"] == second.json()["data"]["trip"]["id"]
    default_page = auth_client.get("/trips/history").json()["data"]
    assert default_page["pagination"]["page"] == 1
    assert default_page["pagination"]["page_size"] == 10
    assert default_page["trips"][0]["id"] == second.json()["data"]["trip"]["id"]
    oldest = auth_client.get("/trips/history?sort_order=asc&page_size=10").json()["data"]
    assert oldest["trips"][0]["id"] == first.json()["data"]["trip"]["id"]

    other = TestClient(auth_client.app, base_url=str(auth_client.base_url))
    try:
        create_user_and_vehicle(other)
        assert other.get("/trips/history").json()["data"]["trips"] == []
        assert other.get("/trips/history").json()["data"]["summary"]["total_trips"] == 0
    finally:
        other.close()


def test_history_requires_session_and_save_csrf(auth_client: TestClient):
    assert auth_client.get("/trips/history").status_code == 401
    csrf, vehicle = create_user_and_vehicle(auth_client)
    no_csrf = auth_client.post("/trips/history", json=payload(vehicle["id"]), headers={"Origin": str(auth_client.base_url).rstrip("/")})
    assert no_csrf.status_code == 403


def test_history_rejects_foreign_vehicle_and_invalid_paging(auth_client: TestClient):
    csrf, vehicle = create_user_and_vehicle(auth_client)
    response = auth_client.get("/trips/history?page=0")
    assert response.status_code == 422
    assert auth_client.get("/trips/history?page_size=11").status_code == 422
    forbidden = auth_client.post("/trips/history", headers={"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf}, json=payload("f" * 32))
    assert forbidden.status_code == 404
    other = TestClient(auth_client.app, base_url=str(auth_client.base_url))
    try:
        other_csrf, _ = create_user_and_vehicle(other)
        foreign = other.post("/trips/history", headers={"Origin": str(other.base_url).rstrip("/"), "X-CSRF-Token": other_csrf}, json=payload(vehicle["id"]))
        assert foreign.status_code == 404
    finally:
        other.close()


def test_history_bounds_pages_and_stabilizes_equal_timestamps(auth_client: TestClient, session_factory):
    csrf, vehicle = create_user_and_vehicle(auth_client)
    headers = {"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf}
    ids = []
    for _ in range(11):
        response = auth_client.post("/trips/history", headers=headers, json=payload(vehicle["id"]))
        assert response.status_code == 201, response.text
        ids.append(response.json()["data"]["trip"]["id"])
    with session_factory() as session:
        session.execute(update(TripHistory).values(created_at=datetime(2026, 1, 1, tzinfo=timezone.utc)))
        session.commit()
    first = auth_client.get("/trips/history?page=1&page_size=10&sort_order=desc").json()["data"]
    second = auth_client.get("/trips/history?page=2&page_size=10&sort_order=desc").json()["data"]
    assert len(first["trips"]) == 10
    assert len(second["trips"]) == 1
    assert [item["id"] for item in first["trips"] + second["trips"]] == sorted(ids)
    out_of_range = auth_client.get("/trips/history?page=3").json()["data"]
    assert out_of_range["trips"] == []
    assert out_of_range["pagination"]["total_pages"] == 2


def test_history_save_rejects_unknown_or_malformed_snapshot_fields(auth_client: TestClient):
    csrf, vehicle = create_user_and_vehicle(auth_client)
    headers = {"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf}
    extra = payload(vehicle["id"])
    extra["owner_account_id"] = "f" * 32
    assert auth_client.post("/trips/history", headers=headers, json=extra).status_code == 422
    malformed = payload(vehicle["id"])
    malformed["route"]["geometry"]["coordinates"] = [[999, 44], [21, 45]]
    assert auth_client.post("/trips/history", headers=headers, json=malformed).status_code == 422
