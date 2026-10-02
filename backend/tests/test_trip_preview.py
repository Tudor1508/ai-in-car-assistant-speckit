import os

from fastapi.testclient import TestClient

from src.trips.settings import TripSettings, TripTestInputs
from tests.trip_test_support import (
    create_authenticated_test_account,
    create_test_vehicle,
    select_live_place,
)


def preview_route(
    client: TestClient,
    csrf_token: str,
    vehicle_id: str,
    origin_query: str,
    destination_query: str,
    current_level_percent: int,
):
    origin = select_live_place(client, origin_query)
    destination = select_live_place(client, destination_query)
    return client.post(
        "/trips/preview",
        headers={
            "Origin": str(client.base_url).rstrip("/"),
            "X-CSRF-Token": csrf_token,
        },
        json={
            "origin": origin,
            "destination": destination,
            "vehicle_id": vehicle_id,
            "current_level_percent": current_level_percent,
        },
    )


def test_live_route_preview_uses_owned_vehicle_range(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(auth_client, inputs, csrf_token)

    response = preview_route(
        auth_client,
        csrf_token,
        str(vehicle["id"]),
        inputs.origin_query,
        inputs.destination_query,
        inputs.current_level_percent,
    )

    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["feasibility"]["status"] == "complete"
    assert result["route"]["distance_m"] > 0
    assert result["route"]["duration_s"] > 0
    assert result["vehicle"]["current_level_percent"] == inputs.current_level_percent
    assert result["vehicle"]["maximum_range_km"] == inputs.vehicle_range_km
    assert all(leg["distance_m"] > 0 for leg in result["legs"])


def test_live_route_preview_includes_range_reachable_stops(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(
        auth_client,
        inputs,
        csrf_token,
        range_km=inputs.stop_vehicle_range_km,
    )

    response = preview_route(
        auth_client,
        csrf_token,
        str(vehicle["id"]),
        inputs.stop_origin_query,
        inputs.stop_destination_query,
        inputs.stop_current_level_percent,
    )

    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["feasibility"]["status"] == "complete"
    assert result["stops"]
    assert len(result["stops"]) <= TripSettings.from_environment().max_stops
    available_range_m = result["vehicle"]["available_range_km"] * 1000
    maximum_range_m = result["vehicle"]["maximum_range_km"] * 1000
    for index, leg in enumerate(result["legs"]):
        leg_limit = available_range_m if index == 0 else maximum_range_m
        assert leg["distance_m"] <= leg_limit


def test_live_route_preview_reports_no_feasible_station_chain(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(
        auth_client,
        inputs,
        csrf_token,
        range_km=inputs.no_station_vehicle_range_km,
    )

    response = preview_route(
        auth_client,
        csrf_token,
        str(vehicle["id"]),
        inputs.no_station_origin_query,
        inputs.no_station_destination_query,
        inputs.no_station_current_level_percent,
    )

    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["feasibility"]["status"] == "incomplete"
    assert result["feasibility"]["message"]

    # An incomplete itinerary must end at the last reachable point, never at the
    # unreachable destination. If no stop is feasible, that point is the origin.
    origin = select_live_place(auth_client, inputs.no_station_origin_query)
    last_reachable = result["stops"][-1] if result["stops"] else origin
    route_end = result["route"]["geometry"]["coordinates"][-1]
    assert abs(route_end[0] - last_reachable["longitude"]) < 0.02
    assert abs(route_end[1] - last_reachable["latitude"]) < 0.02


def test_live_route_preview_maps_provider_auth_error_safely(
    auth_client: TestClient, monkeypatch
) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(auth_client, inputs, csrf_token)
    origin = select_live_place(auth_client, inputs.origin_query)
    destination = select_live_place(auth_client, inputs.destination_query)
    configured_key = os.environ["OPENROUTESERVICE_API_KEY"]
    rejected_key = f"{configured_key}invalid"
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", rejected_key)

    response = auth_client.post(
        "/trips/preview",
        headers={
            "Origin": str(auth_client.base_url).rstrip("/"),
            "X-CSRF-Token": csrf_token,
        },
        json={
            "origin": origin,
            "destination": destination,
            "vehicle_id": vehicle["id"],
            "current_level_percent": inputs.current_level_percent,
        },
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "routing_provider_unavailable"
    assert configured_key not in response.text
    assert rejected_key not in response.text


def test_live_route_preview_hides_foreign_vehicle(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, owner_token = create_authenticated_test_account(auth_client, inputs)
    other_client = TestClient(auth_client.app, base_url=str(auth_client.base_url))
    try:
        _, other_token = create_authenticated_test_account(other_client, inputs)
        foreign_vehicle = create_test_vehicle(other_client, inputs, other_token)

        response = preview_route(
            auth_client,
            owner_token,
            str(foreign_vehicle["id"]),
            inputs.origin_query,
            inputs.destination_query,
            inputs.current_level_percent,
        )
    finally:
        other_client.close()

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "vehicle_not_found"


def test_route_preview_requires_csrf(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(auth_client, inputs, csrf_token)
    origin = select_live_place(auth_client, inputs.origin_query)
    destination = select_live_place(auth_client, inputs.destination_query)

    response = auth_client.post(
        "/trips/preview",
        headers={"Origin": str(auth_client.base_url).rstrip("/")},
        json={
            "origin": origin,
            "destination": destination,
            "vehicle_id": vehicle["id"],
            "current_level_percent": inputs.current_level_percent,
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "invalid_csrf"
