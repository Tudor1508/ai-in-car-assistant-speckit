from fastapi.testclient import TestClient
import pytest

from src.trips.provider import ORSProvider, ORSProviderUnavailable, ORSRouteNotFound, ScenicComparisonUnavailable, scenic_poi_buffer_m
from src.trips.schemas import RouteGeometry
from src.trips.settings import TripSettings
from src.trips.settings import TripTestInputs
from tests.trip_test_support import create_authenticated_test_account, create_test_vehicle, select_live_place


def skip_if_scenic_unavailable(response) -> None:
    error = response.json()["error"]
    assert error["code"] == "route_preference_unavailable"
    details = error.get("details") or []
    reason = details[0].get("reason", "unspecified") if details else "unspecified"
    pytest.skip(f"Scenic unavailable for this configured request ({reason}).")


@pytest.mark.parametrize(
    ("projected_route_length_m", "configured_corridor_m"),
    [(10_000.0, 1_000.0), (350_000.0, 1_000.0), (350_000.0, 50.0)],
)
def test_scenic_tourist_buffer_fits_area_and_configured_bounds(
    projected_route_length_m: float, configured_corridor_m: float
) -> None:
    buffer_m = scenic_poi_buffer_m(projected_route_length_m, configured_corridor_m)

    assert 0 < buffer_m <= configured_corridor_m
    assert buffer_m <= 2_000
    assert projected_route_length_m * 2 * buffer_m <= 50_000_000


def test_scenic_tourist_buffer_rejects_invalid_route_length() -> None:
    with pytest.raises(ScenicComparisonUnavailable):
        scenic_poi_buffer_m(0, 1_000)


def test_highway_avoiding_candidate_uses_ors_avoid_feature_request(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)
    calls = []
    monkeypatch.setattr(provider, "_post_json", lambda path, body, **kwargs: calls.append((path, body, kwargs)) or {
        "features": [{
            "geometry": {"coordinates": [[23, 46], [24, 47]]},
            "properties": {"summary": {"distance": 150_000, "duration": 7_200}},
        }],
    })

    candidate = provider.scenic_biased_candidate([(23, 46), (24, 47)])

    assert candidate is not None
    assert candidate.distance_m == 150_000
    assert len(calls) == 1
    assert calls[0][0] == "/openrouteservice/v2/directions/driving-car/geojson"
    assert calls[0][1]["options"]["avoid_features"] == ["highways"]
    assert calls[0][2]["route_request"] is True


@pytest.mark.parametrize("error_type", [ORSRouteNotFound, ORSProviderUnavailable])
def test_highway_avoiding_candidate_is_ignored_when_ors_cannot_return_it(monkeypatch, error_type) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)

    def unavailable(*_args, **_kwargs):
        raise error_type()

    monkeypatch.setattr(provider, "_post_json", unavailable)

    assert provider.scenic_biased_candidate([(23, 46), (24, 47)]) is None


def test_tourist_normalization_preserves_optional_source_fields_and_route_order(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)
    geometry = RouteGeometry(type="LineString", coordinates=[(0, 0), (0.1, 0)])
    monkeypatch.setattr(provider, "_post_json", lambda *_args, **_kwargs: {
        "features": [
            {"properties": {"category_ids": [{"id": 627}]}, "geometry": {"coordinates": [0.08, 0]}},
            {"id": "earlier", "properties": {"name": "Early viewpoint", "category": {"id": 622}}, "geometry": {"coordinates": [0.02, 0]}},
            {"id": "too-far", "properties": {"name": "Far viewpoint", "category": {"id": 622}}, "geometry": {"coordinates": [0.05, 0.2]}},
        ]
    })

    attractions = provider.tourist_attractions_near_route(geometry)

    assert [item["source_id"] for item in attractions] == ["earlier", None]
    assert [item["category"] for item in attractions] == ["attraction", "viewpoint"]
    assert attractions[1]["name"] is None
    assert attractions[0]["route_progress_m"] < attractions[1]["route_progress_m"]
    assert all("detour" not in item for item in attractions)


def test_geoapify_recommendations_more_than_10km_from_route_are_filtered(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)
    geometry = RouteGeometry(type="LineString", coordinates=[(0, 0), (1, 0)])
    monkeypatch.setattr(provider, "_geoapify_route_features", lambda *_args, **_kwargs: [
        {"id": "near", "properties": {"name": "Near", "categories": ["catering.restaurant"]}, "geometry": {"coordinates": [0.5, 0.05]}},
        {"id": "far", "properties": {"name": "Far", "categories": ["catering.restaurant"]}, "geometry": {"coordinates": [0.5, 0.2]}},
    ])

    restaurants = provider._geoapify_places_near_route(geometry, ["catering.restaurant"], "restaurant")

    assert [restaurant["source_id"] for restaurant in restaurants] == ["near"]


def test_tourist_normalization_returns_empty_list_when_source_has_no_attractions(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)
    monkeypatch.setattr(provider, "_post_json", lambda *_args, **_kwargs: {"features": []})

    assert provider.tourist_attractions_near_route(
        RouteGeometry(type="LineString", coordinates=[(0, 0), (0.1, 0)])
    ) == []


def test_tourist_source_errors_are_not_silently_reported_as_empty(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 10, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)

    def raise_provider_error(*_args, **_kwargs):
        raise ORSProviderUnavailable("source unavailable")

    monkeypatch.setattr(provider, "_post_json", raise_provider_error)

    with pytest.raises(ORSProviderUnavailable):
        provider.tourist_attractions_near_route(
            RouteGeometry(type="LineString", coordinates=[(0, 0), (0.1, 0)])
        )


def test_tourist_limit_rejects_incomplete_result_set(monkeypatch) -> None:
    settings = TripSettings("test-key", "https://example.invalid", 1, 3, 1_000, 2, (593, 594), 596, (622, 627), 5)
    provider = ORSProvider(settings)
    monkeypatch.setattr(provider, "_post_json", lambda *_args, **_kwargs: {"features": [{}, {}]})

    with pytest.raises(ScenicComparisonUnavailable, match="poi_results_incomplete"):
        provider.tourist_attractions_near_route(
            RouteGeometry(type="LineString", coordinates=[(0, 0), (0.1, 0)])
        )


def test_live_scenic_preview_has_tied_options_or_clear_unavailability(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(auth_client, inputs, csrf_token)
    origin = select_live_place(auth_client, inputs.origin_query)
    destination = select_live_place(auth_client, inputs.destination_query)
    response = auth_client.post(
        "/trips/preview",
        headers={"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf_token},
        json={
            "origin": origin,
            "destination": destination,
            "vehicle_id": vehicle["id"],
            "current_level_percent": inputs.current_level_percent,
            "route_preference": "scenic",
        },
    )
    if response.status_code == 422:
        skip_if_scenic_unavailable(response)
    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["route_preference"] == "scenic"
    options = result["route_options"]
    assert len(options) > 0
    assert result["selected_route_option_id"] == options[0]["id"]
    assert all(option["attraction_count"] == options[0]["attraction_count"] for option in options)
    assert len({tuple(map(tuple, option["route"]["geometry"]["coordinates"])) for option in options}) == len(options)
    for option in options:
        assert option["route"]["distance_m"] > 0
        assert option["route"]["duration_s"] > 0
        attractions = option["attractions"]
        assert option["attraction_count"] == len(attractions)
        assert [item["sequence"] for item in attractions] == list(range(1, len(attractions) + 1))
        assert all(item["category"] in {"attraction", "viewpoint"} for item in attractions)
        assert all(item["name"] is None or item["name"].strip() for item in attractions)
        assert [item["route_progress_m"] for item in attractions] == sorted(
            item["route_progress_m"] for item in attractions
        )
        assert all(item["route_progress_m"] >= 0 for item in attractions)
        assert all(item["route_progress_m"] <= option["route"]["distance_m"] for item in attractions)
        assert all(-90 <= item["latitude"] <= 90 and -180 <= item["longitude"] <= 180 for item in attractions)
        assert all("detour" not in item for item in attractions)


def test_live_scenic_with_energy_stops_keeps_attractions_separate(auth_client: TestClient) -> None:
    inputs = TripTestInputs.from_environment()
    _, csrf_token = create_authenticated_test_account(auth_client, inputs)
    vehicle = create_test_vehicle(
        auth_client, inputs, csrf_token, range_km=inputs.stop_vehicle_range_km
    )
    origin = select_live_place(auth_client, inputs.stop_origin_query)
    destination = select_live_place(auth_client, inputs.stop_destination_query)
    response = auth_client.post(
        "/trips/preview",
        headers={"Origin": str(auth_client.base_url).rstrip("/"), "X-CSRF-Token": csrf_token},
        json={
            "origin": origin,
            "destination": destination,
            "vehicle_id": vehicle["id"],
            "current_level_percent": inputs.stop_current_level_percent,
            "route_preference": "scenic",
        },
    )
    if response.status_code == 422:
        skip_if_scenic_unavailable(response)
    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["route_preference"] == "scenic"
    assert result["feasibility"]["status"] == result["route_options"][0]["feasibility"]["status"]
    assert result["route"]["geometry"] == result["route_options"][0]["route"]["geometry"]
    assert result["stops"] == result["route_options"][0]["stops"]
    assert result["attractions"] == result["route_options"][0]["attractions"]
    assert result["stops"]
    expected_station_type = "charging" if inputs.vehicle_type == "electric" else "fuel"
    assert all(stop["station_type"] == expected_station_type for stop in result["stops"])
    assert [stop["sequence"] for stop in result["stops"]] == list(
        range(1, len(result["stops"]) + 1)
    )
    available_range_m = result["vehicle"]["available_range_km"] * 1000
    maximum_range_m = result["vehicle"]["maximum_range_km"] * 1000
    for index, leg in enumerate(result["legs"]):
        leg_limit = available_range_m if index == 0 else maximum_range_m
        assert leg["distance_m"] <= leg_limit
    assert all(item["category"] in {"attraction", "viewpoint"} for item in result["attractions"])
