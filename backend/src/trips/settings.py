from dataclasses import dataclass, field
from datetime import datetime, timezone
import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


class TripConfigurationError(ValueError):
    """Raised when required trip-provider configuration is invalid."""


def _required_text(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise TripConfigurationError(f"{name} must be configured")
    return value


def _configured_text(name: str, default: str) -> str:
    return os.environ.get(name, "").strip() or default


def _configured_positive_int(name: str, default: int) -> int:
    value = _configured_text(name, str(default))
    try:
        parsed = int(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be an integer") from error
    if parsed <= 0:
        raise TripConfigurationError(f"{name} must be greater than zero")
    return parsed


def _configured_positive_float(name: str, default: float) -> float:
    value = _configured_text(name, str(default))
    try:
        parsed = float(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be a number") from error
    if parsed <= 0:
        raise TripConfigurationError(f"{name} must be greater than zero")
    return parsed


def _positive_int(name: str) -> int:
    value = _required_text(name)
    try:
        parsed = int(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be an integer") from error
    if parsed <= 0:
        raise TripConfigurationError(f"{name} must be greater than zero")
    return parsed


def _nonnegative_int(name: str) -> int:
    value = _required_text(name)
    try:
        parsed = int(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be an integer") from error
    if parsed < 0:
        raise TripConfigurationError(f"{name} must not be negative")
    return parsed


def _configured_positive_int_list(name: str, default: tuple[int, ...]) -> tuple[int, ...]:
    raw = _configured_text(name, ",".join(str(value) for value in default))
    try:
        parsed = tuple(int(value.strip()) for value in raw.split(","))
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be a comma-separated list of integers") from error
    if not parsed or any(value <= 0 for value in parsed):
        raise TripConfigurationError(f"{name} must contain positive IDs")
    return parsed


@dataclass(frozen=True)
class TripSettings:
    api_key: str = field(repr=False)
    base_url: str
    timeout_seconds: float
    geocode_min_chars: int
    poi_corridor_meters: float
    poi_limit: int
    charging_category_ids: tuple[int, ...]
    fuel_category_id: int
    max_stops: int

    @classmethod
    def from_environment(cls) -> "TripSettings":
        base_url = _configured_text(
            "OPENROUTESERVICE_BASE_URL", "https://api.heigit.org"
        ).rstrip("/")
        parsed_url = urlparse(base_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise TripConfigurationError("OPENROUTESERVICE_BASE_URL must be an absolute HTTP(S) URL")
        # HeiGIT moved the public services to api.heigit.org. Keep older local
        # .env files working by translating their previous public host.
        if parsed_url.netloc.lower() == "api.openrouteservice.org" and not parsed_url.path:
            base_url = "https://api.heigit.org"

        return cls(
            api_key=_required_text("OPENROUTESERVICE_API_KEY"),
            base_url=base_url,
            timeout_seconds=_configured_positive_float("OPENROUTESERVICE_TIMEOUT_SECONDS", 20),
            geocode_min_chars=_configured_positive_int("OPENROUTESERVICE_GEOCODE_MIN_CHARS", 3),
            poi_corridor_meters=_configured_positive_float("OPENROUTESERVICE_POI_CORRIDOR_METERS", 1000),
            poi_limit=_configured_positive_int("OPENROUTESERVICE_POI_LIMIT", 50),
            charging_category_ids=_configured_positive_int_list(
                "OPENROUTESERVICE_CHARGING_CATEGORY_IDS", (593, 594)
            ),
            fuel_category_id=_configured_positive_int("OPENROUTESERVICE_FUEL_CATEGORY_ID", 596),
            max_stops=_configured_positive_int("TRIP_MAX_STOPS", 5),
        )


def _percent(name: str) -> int:
    value = _required_text(name)
    try:
        parsed = int(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be an integer percentage") from error
    if not 0 <= parsed <= 100:
        raise TripConfigurationError(f"{name} must be between 0 and 100")
    return parsed


def _coordinate(name: str, minimum: float, maximum: float) -> float:
    value = _required_text(name)
    try:
        parsed = float(value)
    except ValueError as error:
        raise TripConfigurationError(f"{name} must be a coordinate") from error
    if not minimum <= parsed <= maximum:
        raise TripConfigurationError(f"{name} is outside the valid coordinate bounds")
    return parsed


@dataclass(frozen=True)
class TripTestInputs:
    account_name: str
    account_email: str
    account_password: str = field(repr=False)
    vehicle_name: str
    vehicle_model: str
    vehicle_year: int
    vehicle_mileage_km: int
    origin_query: str
    unresolved_query: str
    destination_query: str
    vehicle_range_km: int
    current_level_percent: int
    vehicle_type: str
    fuel_type: str | None
    stop_origin_query: str
    stop_destination_query: str
    stop_vehicle_range_km: int
    stop_current_level_percent: int
    no_station_origin_query: str
    no_station_destination_query: str
    no_station_vehicle_range_km: int
    no_station_current_level_percent: int
    current_location_latitude: float
    current_location_longitude: float

    @classmethod
    def from_environment(cls) -> "TripTestInputs":
        vehicle_type = _required_text("TRIP_TEST_VEHICLE_TYPE")
        if vehicle_type not in {"combustion", "electric"}:
            raise TripConfigurationError("TRIP_TEST_VEHICLE_TYPE must be a supported vehicle type")

        fuel_type = os.environ.get("TRIP_TEST_FUEL_TYPE", "").strip() or None
        if vehicle_type == "combustion" and fuel_type not in {"petrol", "diesel", "lpg", "cng", "other"}:
            raise TripConfigurationError("TRIP_TEST_FUEL_TYPE must match the configured combustion vehicle")
        if vehicle_type == "electric" and fuel_type is not None:
            raise TripConfigurationError("TRIP_TEST_FUEL_TYPE must be empty for an electric vehicle")

        vehicle_year = _positive_int("TRIP_TEST_VEHICLE_YEAR")
        if not 1886 <= vehicle_year <= datetime.now(timezone.utc).year:
            raise TripConfigurationError("TRIP_TEST_VEHICLE_YEAR must be a valid vehicle year")
        account_email = _required_text("TRIP_TEST_ACCOUNT_EMAIL")
        if account_email.count("@") != 1:
            raise TripConfigurationError("TRIP_TEST_ACCOUNT_EMAIL must be a valid email address")

        return cls(
            account_name=_required_text("TRIP_TEST_ACCOUNT_NAME"),
            account_email=account_email,
            account_password=_required_text("TRIP_TEST_ACCOUNT_PASSWORD"),
            vehicle_name=_required_text("TRIP_TEST_VEHICLE_NAME"),
            vehicle_model=_required_text("TRIP_TEST_VEHICLE_MODEL"),
            vehicle_year=vehicle_year,
            vehicle_mileage_km=_nonnegative_int("TRIP_TEST_VEHICLE_MILEAGE_KM"),
            origin_query=_required_text("TRIP_TEST_ORIGIN_QUERY"),
            unresolved_query=_required_text("TRIP_TEST_UNRESOLVED_QUERY"),
            destination_query=_required_text("TRIP_TEST_DESTINATION_QUERY"),
            vehicle_range_km=_positive_int("TRIP_TEST_VEHICLE_RANGE_KM"),
            current_level_percent=_percent("TRIP_TEST_CURRENT_LEVEL_PERCENT"),
            vehicle_type=vehicle_type,
            fuel_type=fuel_type,
            stop_origin_query=_required_text("TRIP_TEST_STOP_ORIGIN_QUERY"),
            stop_destination_query=_required_text("TRIP_TEST_STOP_DESTINATION_QUERY"),
            stop_vehicle_range_km=_positive_int("TRIP_TEST_STOP_VEHICLE_RANGE_KM"),
            stop_current_level_percent=_percent("TRIP_TEST_STOP_CURRENT_LEVEL_PERCENT"),
            no_station_origin_query=_required_text("TRIP_TEST_NO_STATION_ORIGIN_QUERY"),
            no_station_destination_query=_required_text("TRIP_TEST_NO_STATION_DESTINATION_QUERY"),
            no_station_vehicle_range_km=_positive_int("TRIP_TEST_NO_STATION_VEHICLE_RANGE_KM"),
            no_station_current_level_percent=_percent("TRIP_TEST_NO_STATION_CURRENT_LEVEL_PERCENT"),
            current_location_latitude=_coordinate("TRIP_TEST_CURRENT_LOCATION_LATITUDE", -90, 90),
            current_location_longitude=_coordinate("TRIP_TEST_CURRENT_LOCATION_LONGITUDE", -180, 180),
        )
