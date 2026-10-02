import pytest
from pydantic import ValidationError

from src.trips.schemas import PlaceSelection, TripPreviewRequest


def valid_place(label: str, latitude: float, longitude: float) -> dict[str, object]:
    return {"label": label, "latitude": latitude, "longitude": longitude}


def valid_preview_request() -> dict[str, object]:
    return {
        "origin": valid_place("Origin", 46.0, 23.0),
        "destination": valid_place("Destination", 45.0, 24.0),
        "vehicle_id": "a" * 32,
        "current_level_percent": 50,
    }


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("latitude", float("nan")),
        ("latitude", 90.01),
        ("latitude", -90.01),
        ("longitude", float("inf")),
        ("longitude", 180.01),
        ("longitude", -180.01),
    ],
)
def test_place_selection_rejects_non_wgs84_coordinates(field: str, value: float) -> None:
    place = valid_place("A place", 0.0, 0.0)
    place[field] = value

    with pytest.raises(ValidationError):
        PlaceSelection.model_validate(place)


@pytest.mark.parametrize("label", ["", "   "])
def test_place_selection_rejects_empty_or_whitespace_label(label: str) -> None:
    with pytest.raises(ValidationError):
        PlaceSelection.model_validate(valid_place(label, 0.0, 0.0))


@pytest.mark.parametrize("level", [-1, 101, 50.0, True])
def test_preview_rejects_invalid_current_level(level: object) -> None:
    request = valid_preview_request()
    request["current_level_percent"] = level

    with pytest.raises(ValidationError):
        TripPreviewRequest.model_validate(request)


@pytest.mark.parametrize("vehicle_id", ["", "a" * 31, "a" * 33, "g" * 32])
def test_preview_rejects_invalid_vehicle_id(vehicle_id: str) -> None:
    request = valid_preview_request()
    request["vehicle_id"] = vehicle_id

    with pytest.raises(ValidationError):
        TripPreviewRequest.model_validate(request)


def test_preview_rejects_client_supplied_vehicle_properties() -> None:
    request = valid_preview_request()
    request["range_km"] = 500
    request["vehicle_type"] = "electric"

    with pytest.raises(ValidationError):
        TripPreviewRequest.model_validate(request)


def test_preview_accepts_valid_boundary_percentage_and_trims_labels() -> None:
    request = valid_preview_request()
    request["current_level_percent"] = 0
    request["origin"] = valid_place("  Origin  ", -90.0, -180.0)
    request["destination"] = valid_place(" Destination ", 90.0, 180.0)

    parsed = TripPreviewRequest.model_validate(request)

    assert parsed.current_level_percent == 0
    assert parsed.origin.label == "Origin"
    assert parsed.destination.label == "Destination"
