import os
from types import SimpleNamespace
import pytest
from fastapi import HTTPException

from fastapi.testclient import TestClient

from src.trips.settings import TripSettings, TripTestInputs
from src.trips import service as trip_service
from src.trips.provider import ORSProvider, ORSProviderUnavailable
from src.trips.schemas import PlaceSelection, RouteGeometry, RouteMetrics, TripPreviewRequest
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
    route_preference: str | None = None,
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
            **({"route_preference": route_preference} if route_preference else {}),
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


def test_live_fastest_and_shortest_report_the_requested_preference(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(auth_client, inputs, csrf_token)
    metrics: dict[str, tuple[float, float]] = {}
    for preference in ("fastest", "shortest"):
        response = preview_route(
            auth_client, csrf_token, str(vehicle["id"]), inputs.origin_query,
            inputs.destination_query, inputs.current_level_percent, preference,
        )
        assert response.status_code == 200, response.text
        result = response.json()["data"]
        assert result["route_preference"] == preference
        assert result["selected_route_option_id"] == result["route_options"][0]["id"]
        assert result["route"]["distance_m"] == result["route_options"][0]["route"]["distance_m"]
        assert result["route"]["duration_s"] == result["route_options"][0]["route"]["duration_s"]
        assert result["feasibility"] == result["route_options"][0]["feasibility"]
        metrics[preference] = (result["route"]["distance_m"], result["route"]["duration_s"])
    assert metrics["fastest"][1] <= metrics["shortest"][1]
    assert metrics["shortest"][0] <= metrics["fastest"][0]


def test_scenic_preview_keeps_distinct_tied_winners_and_excludes_lower_score(monkeypatch) -> None:
    route_a = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (5, 0.1), (10, 0)]), distance_m=10_000, duration_s=600)
    route_b = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (5, 0.2), (10, 0)]), distance_m=12_000, duration_s=720)
    lower = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (5, 0.1), (10, 0.1)]), distance_m=9_000, duration_s=540)

    class CandidateProvider:
        def __init__(self, _settings):
            pass

        _great_circle_distance_m = staticmethod(ORSProvider._great_circle_distance_m)

        def directions_candidates(self, _points, preference):
            return [route_a, lower] if preference == "fastest" else [route_b, lower]

        def tourist_attractions_near_route(self, geometry):
            coordinates = tuple(geometry.coordinates)
            if coordinates == tuple(route_a.geometry.coordinates):
                return [{"source_id": "a-1", "name": "First", "category": "attraction", "latitude": 0.1, "longitude": 0.2, "route_progress_m": 200_000}, {"source_id": "a-2", "name": None, "category": "viewpoint", "latitude": 0.1, "longitude": 0.7, "route_progress_m": 500_000}]
            if coordinates == tuple(route_b.geometry.coordinates):
                return [{"source_id": "b-1", "name": "First", "category": "attraction", "latitude": 0.2, "longitude": 0.2, "route_progress_m": 200_000}, {"source_id": "b-2", "name": "Second", "category": "viewpoint", "latitude": 0.2, "longitude": 0.7, "route_progress_m": 500_000}]
            return [{"source_id": "lower-1", "name": "Only one", "category": "attraction", "latitude": 0.1, "longitude": 0.4, "route_progress_m": 400_000}]

    monkeypatch.setattr(trip_service, "get_owned_vehicle", lambda *_args: SimpleNamespace(id="a" * 32, range_km=100, type="combustion", fuel_type="petrol"))
    monkeypatch.setattr(trip_service, "ORSProvider", CandidateProvider)
    request = TripPreviewRequest(
        origin=PlaceSelection(label="Origin", latitude=0, longitude=0),
        destination=PlaceSelection(label="Destination", latitude=0, longitude=1),
        vehicle_id="a" * 32, current_level_percent=100, route_preference="scenic",
    )
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 50, (593, 594), 596, (622, 627), 5)

    result = trip_service.preview_owned_trip(None, SimpleNamespace(id="owner"), request, settings)

    assert result.route_preference == "scenic"
    assert result.selected_route_option_id == result.route_options[0].id
    assert len(result.route_options) == 2
    assert [option.attraction_count for option in result.route_options] == [2, 2]
    assert [option.route.geometry for option in result.route_options] == [route_a.geometry, route_b.geometry]
    assert [option.route.distance_m for option in result.route_options] == [10_000, 12_000]
    assert all(option.feasibility.status == "complete" for option in result.route_options)
    assert [item.source_id for item in result.attractions] == ["a-1", "a-2"]


def test_all_preview_includes_highway_avoiding_candidate_as_canonical_scenic(monkeypatch) -> None:
    fastest = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (3, 0.1), (6, 0)]), distance_m=10_000, duration_s=600)
    shortest = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (3, 0.2), (6, 0)]), distance_m=9_000, duration_s=620)
    avoid_highways = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (3, 0.3), (6, 0)]), distance_m=11_000, duration_s=700)

    class AllRoutesProvider:
        MATRIX_BATCH_SIZE = 24
        _great_circle_distance_m = staticmethod(ORSProvider._great_circle_distance_m)
        same_geometry = False

        def __init__(self, _settings):
            pass

        def directions_candidates(self, _points, preference):
            if self.same_geometry:
                return [fastest]
            return [fastest if preference == "fastest" else shortest]

        def scenic_biased_candidate(self, _points):
            return fastest if self.same_geometry else avoid_highways

        def tourist_attractions_near_route(self, geometry):
            if geometry == avoid_highways.geometry:
                return [
                    {"source_id": f"scenic-{index}", "name": None, "category": "viewpoint", "latitude": 0.1, "longitude": index / 10, "route_progress_m": index * 200_000}
                    for index in range(1, 4)
                ]
            return [{"source_id": f"other-{geometry.coordinates[1][1]}", "name": "POI", "category": "attraction", "latitude": 0.1, "longitude": 0.5, "route_progress_m": 1_000}]

    monkeypatch.setattr(trip_service, "get_owned_vehicle", lambda *_args: SimpleNamespace(id="a" * 32, range_km=1_000, type="combustion", fuel_type="petrol"))
    monkeypatch.setattr(trip_service, "ORSProvider", AllRoutesProvider)
    request = TripPreviewRequest(
        origin=PlaceSelection(label="Origin", latitude=0, longitude=0),
        destination=PlaceSelection(label="Destination", latitude=0, longitude=1),
        vehicle_id="a" * 32, current_level_percent=100, route_preference="all",
    )
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 50, (593, 594), 596, (622, 627), 5)

    result = trip_service.preview_owned_trip(None, SimpleNamespace(id="owner"), request, settings)

    scenic_choice = next(choice for choice in result.route_choices if choice.preference == "scenic")
    scenic_option = next(option for option in result.route_options if option.id == scenic_choice.route_option_id)
    fastest_choice = next(choice for choice in result.route_choices if choice.preference == "fastest")
    shortest_choice = next(choice for choice in result.route_choices if choice.preference == "shortest")
    fastest_option = next(option for option in result.route_options if option.id == fastest_choice.route_option_id)
    shortest_option = next(option for option in result.route_options if option.id == shortest_choice.route_option_id)
    assert result.route_preference == "all"
    assert len(result.route_options) == 3
    assert fastest_option.route.geometry == fastest.geometry
    assert shortest_option.route.geometry == shortest.geometry
    assert scenic_option.route.geometry == avoid_highways.geometry
    assert scenic_option.attraction_count == 3
    assert [item.sequence for item in scenic_option.attractions] == [1, 2, 3]
    assert fastest_choice.route_option_id != scenic_choice.route_option_id
    assert shortest_choice.route_option_id != scenic_choice.route_option_id
    assert fastest_option.feasibility.status == shortest_option.feasibility.status == scenic_option.feasibility.status == "complete"
    assert fastest_option.stops == shortest_option.stops == scenic_option.stops == []

    AllRoutesProvider.same_geometry = True
    duplicate_result = trip_service.preview_owned_trip(None, SimpleNamespace(id="owner"), request, settings)
    assert len(duplicate_result.route_options) == 3
    assert [option.route_labels for option in duplicate_result.route_options] == [["fastest"], ["shortest"], ["scenic"]]
    assert len({choice.route_option_id for choice in duplicate_result.route_choices}) == 3


def test_scenic_preview_returns_unavailable_when_routes_are_not_comparable(monkeypatch) -> None:
    route = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (1, 0)]), distance_m=10_000, duration_s=600)

    class SingleGeometryProvider:
        def __init__(self, _settings):
            pass

        def directions_candidates(self, *_args):
            return [route]

    monkeypatch.setattr(trip_service, "get_owned_vehicle", lambda *_args: SimpleNamespace(id="a" * 32, range_km=100, type="combustion", fuel_type="petrol"))
    monkeypatch.setattr(trip_service, "ORSProvider", SingleGeometryProvider)
    request = TripPreviewRequest(
        origin=PlaceSelection(label="Origin", latitude=0, longitude=0),
        destination=PlaceSelection(label="Destination", latitude=0, longitude=1),
        vehicle_id="a" * 32, current_level_percent=100, route_preference="scenic",
    )
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 50, (593, 594), 596, (622, 627), 5)

    with pytest.raises(HTTPException) as error:
        trip_service.preview_owned_trip(None, SimpleNamespace(id="owner"), request, settings)

    assert error.value.status_code == 422
    assert error.value.detail == {"code": "route_preference_unavailable", "reason": "no_distinct_candidates"}


def test_scenic_source_error_maps_to_safe_provider_error(monkeypatch) -> None:
    route_a = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (0.5, 0.1), (1, 0)]), distance_m=10_000, duration_s=600)
    route_b = RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=[(0, 0), (0.5, 0.2), (1, 0)]), distance_m=12_000, duration_s=720)

    class UnavailablePoiProvider:
        def __init__(self, _settings):
            pass

        def directions_candidates(self, _points, preference):
            return [route_a if preference == "fastest" else route_b]

        def tourist_attractions_near_route(self, _geometry):
            raise ORSProviderUnavailable("private upstream details")

    monkeypatch.setattr(trip_service, "get_owned_vehicle", lambda *_args: SimpleNamespace(id="a" * 32, range_km=100, type="combustion", fuel_type="petrol"))
    monkeypatch.setattr(trip_service, "ORSProvider", UnavailablePoiProvider)
    request = TripPreviewRequest(
        origin=PlaceSelection(label="Origin", latitude=0, longitude=0),
        destination=PlaceSelection(label="Destination", latitude=0, longitude=1),
        vehicle_id="a" * 32, current_level_percent=100, route_preference="scenic",
    )
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 50, (593, 594), 596, (622, 627), 5)

    with pytest.raises(HTTPException) as error:
        trip_service.preview_owned_trip(None, SimpleNamespace(id="owner"), request, settings)

    assert error.value.status_code == 502
    assert error.value.detail == "routing_provider_unavailable"
    assert "private upstream details" not in str(error.value.detail)


def test_live_route_preview_includes_range_reachable_stops(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(
        auth_client,
        inputs,
        csrf_token,
        range_km=inputs.stop_vehicle_range_km,
    )

    origin = select_live_place(auth_client, inputs.stop_origin_query)
    destination = select_live_place(auth_client, inputs.stop_destination_query)
    expected_station_type = "charging" if inputs.vehicle_type == "electric" else "fuel"
    for preference in ("fastest", "shortest"):
        response = auth_client.post(
            "/trips/preview",
            headers={
                "Origin": str(auth_client.base_url).rstrip("/"),
                "X-CSRF-Token": csrf_token,
            },
            json={
                "origin": origin,
                "destination": destination,
                "vehicle_id": str(vehicle["id"]),
                "current_level_percent": inputs.stop_current_level_percent,
                "route_preference": preference,
            },
        )

        assert response.status_code == 200, response.text
        result = response.json()["data"]
        assert result["route_preference"] == preference
        assert result["feasibility"]["status"] == "complete"
        assert result["stops"]
        assert [stop["sequence"] for stop in result["stops"]] == list(
            range(1, len(result["stops"]) + 1)
        )
        assert all(stop["station_type"] == expected_station_type for stop in result["stops"])
        assert len(result["stops"]) <= TripSettings.from_environment().max_stops
        available_range_m = result["vehicle"]["available_range_km"] * 1000
        maximum_range_m = result["vehicle"]["maximum_range_km"] * 1000
        for index, leg in enumerate(result["legs"]):
            leg_limit = available_range_m if index == 0 else maximum_range_m
            assert leg["distance_m"] <= leg_limit

    if inputs.vehicle_type == "combustion":
        with TestClient(auth_client.app, base_url=str(auth_client.base_url)) as electric_client:
            _, electric_csrf_token = create_authenticated_test_account(electric_client, inputs)
            electric_vehicle = create_test_vehicle(
                electric_client,
                inputs,
                electric_csrf_token,
                range_km=inputs.stop_vehicle_range_km,
                vehicle_type="electric",
            )
            electric_response = electric_client.post(
                "/trips/preview",
                headers={
                    "Origin": str(electric_client.base_url).rstrip("/"),
                    "X-CSRF-Token": electric_csrf_token,
                },
                json={
                    "origin": origin,
                    "destination": destination,
                    "vehicle_id": str(electric_vehicle["id"]),
                    "current_level_percent": inputs.stop_current_level_percent,
                    "route_preference": "fastest",
                },
            )
            assert electric_response.status_code == 200, electric_response.text
            electric_result = electric_response.json()["data"]
            assert electric_result["route_preference"] == "fastest"
            assert electric_result["feasibility"]["status"] == "complete"
            assert electric_result["stops"]
            assert all(stop["station_type"] == "charging" for stop in electric_result["stops"])
            available_range_m = electric_result["vehicle"]["available_range_km"] * 1000
            maximum_range_m = electric_result["vehicle"]["maximum_range_km"] * 1000
            for index, leg in enumerate(electric_result["legs"]):
                leg_limit = available_range_m if index == 0 else maximum_range_m
                assert leg["distance_m"] <= leg_limit


@pytest.mark.parametrize("preference", ["fastest", "shortest"])
def test_live_route_preview_reports_no_feasible_station_chain(
    auth_client: TestClient, preference: str
) -> None:
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
        preference,
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
            "route_preference": "scenic",
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
