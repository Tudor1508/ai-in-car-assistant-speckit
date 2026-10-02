from dataclasses import dataclass
import math
from typing import Any, Literal

import httpx

from src.trips.schemas import PlaceSuggestion, RouteGeometry, RouteMetrics, RouteStop
from src.trips.settings import TripSettings


class ORSProviderUnavailable(Exception):
    """Raised when the configured ORS service cannot complete a request."""


class ORSRouteNotFound(Exception):
    """Raised when ORS cannot find a route for the requested coordinates."""


@dataclass(frozen=True)
class StationCandidate:
    stop: RouteStop
    route_progress_m: float


class ORSProvider:
    def __init__(self, settings: TripSettings) -> None:
        self._settings = settings

    def autocomplete(self, query: str) -> list[PlaceSuggestion]:
        payload = self._get_json(
            "/pelias/v1/autocomplete",
            params={"text": query, "size": self._settings.poi_limit},
        )
        features = payload.get("features")
        if not isinstance(features, list):
            raise ORSProviderUnavailable()

        suggestions: list[PlaceSuggestion] = []
        for feature in features:
            if not isinstance(feature, dict):
                continue
            properties = feature.get("properties")
            geometry = feature.get("geometry")
            if not isinstance(properties, dict) or not isinstance(geometry, dict):
                continue
            coordinates = geometry.get("coordinates")
            if not isinstance(coordinates, list) or len(coordinates) < 2:
                continue
            longitude = self._finite_number(coordinates[0])
            latitude = self._finite_number(coordinates[1])
            label = properties.get("label")
            if (
                longitude is None
                or latitude is None
                or not -180 <= longitude <= 180
                or not -90 <= latitude <= 90
                or not isinstance(label, str)
                or not label.strip()
                or len(label.strip()) > 255
            ):
                continue
            provider_id = feature.get("id")
            if provider_id is not None and len(str(provider_id)) > 255:
                provider_id = None
            suggestions.append(
                PlaceSuggestion(
                    label=label.strip(),
                    latitude=latitude,
                    longitude=longitude,
                    provider_id=str(provider_id) if provider_id is not None else None,
                )
            )
        return suggestions

    def directions(self, coordinates: list[tuple[float, float]]) -> RouteMetrics:
        if len(coordinates) < 2:
            raise ValueError("Directions require an origin and destination")
        payload = self._post_json(
            "/openrouteservice/v2/directions/driving-car/geojson",
            {
                "coordinates": [[longitude, latitude] for longitude, latitude in coordinates],
                "instructions": False,
                "geometry_simplify": False,
            },
            route_request=True,
        )
        features = payload.get("features")
        if not isinstance(features, list) or not features:
            raise ORSRouteNotFound()
        feature = features[0]
        if not isinstance(feature, dict):
            raise ORSProviderUnavailable()
        geometry_payload = feature.get("geometry")
        properties = feature.get("properties")
        summary = properties.get("summary") if isinstance(properties, dict) else None
        if not isinstance(geometry_payload, dict) or not isinstance(summary, dict):
            raise ORSProviderUnavailable()
        raw_coordinates = geometry_payload.get("coordinates")
        if not isinstance(raw_coordinates, list) or len(raw_coordinates) < 2:
            raise ORSProviderUnavailable()

        coordinates_result: list[tuple[float, float]] = []
        for point in raw_coordinates:
            if not isinstance(point, list) or len(point) < 2:
                raise ORSProviderUnavailable()
            longitude = self._finite_number(point[0])
            latitude = self._finite_number(point[1])
            if (
                longitude is None
                or latitude is None
                or not -180 <= longitude <= 180
                or not -90 <= latitude <= 90
            ):
                raise ORSProviderUnavailable()
            coordinates_result.append((longitude, latitude))

        distance_m = self._finite_number(summary.get("distance"))
        duration_s = self._finite_number(summary.get("duration"))
        if distance_m is None or duration_s is None or distance_m <= 0 or duration_s <= 0:
            raise ORSProviderUnavailable()
        return RouteMetrics(
            geometry=RouteGeometry(type="LineString", coordinates=coordinates_result),
            distance_m=distance_m,
            duration_s=duration_s,
        )

    def stations_near_route(
        self,
        geometry: RouteGeometry,
        station_type: Literal["charging", "fuel"],
        fuel_type: str | None = None,
    ) -> list[StationCandidate]:
        category_ids = (
            self._settings.charging_category_ids
            if station_type == "charging"
            else (self._settings.fuel_category_id,)
        )
        payload = self._post_json(
            "/openpoiservice/v0/pois",
            {
                "request": "pois",
                "geometry": {
                    "geojson": {
                        "type": geometry.type,
                        "coordinates": geometry.coordinates,
                    },
                    "buffer": self._settings.poi_corridor_meters,
                },
                "limit": self._settings.poi_limit,
                "filters": {"category_ids": list(category_ids)},
            },
        )
        features = payload.get("features")
        if not isinstance(features, list):
            raise ORSProviderUnavailable()

        candidates: list[StationCandidate] = []
        for feature in features:
            if not isinstance(feature, dict):
                continue
            feature_geometry = feature.get("geometry")
            properties = feature.get("properties")
            if not isinstance(feature_geometry, dict) or not isinstance(properties, dict):
                continue
            raw_coordinates = feature_geometry.get("coordinates")
            if not isinstance(raw_coordinates, list) or len(raw_coordinates) < 2:
                continue
            longitude = self._finite_number(raw_coordinates[0])
            latitude = self._finite_number(raw_coordinates[1])
            if (
                longitude is None
                or latitude is None
                or not -180 <= longitude <= 180
                or not -90 <= latitude <= 90
            ):
                continue

            tags = properties.get("osm_tags")
            if station_type == "fuel" and isinstance(tags, dict) and not self._fuel_compatible(tags, fuel_type):
                continue
            name = properties.get("name")
            if not isinstance(name, str) and isinstance(tags, dict):
                name = tags.get("name")
            provider_id = properties.get("osm_id", feature.get("id"))
            if provider_id is not None and len(str(provider_id)) > 255:
                provider_id = None
            candidate_progress = self._route_progress_m(
                geometry.coordinates, longitude, latitude
            )
            if candidate_progress is None:
                continue
            candidates.append(
                StationCandidate(
                    stop=RouteStop(
                        sequence=0,
                        provider_id=str(provider_id) if provider_id is not None else None,
                        name=name.strip() if isinstance(name, str) and name.strip() else None,
                        station_type=station_type,
                        latitude=latitude,
                        longitude=longitude,
                        leg_distance_m=0,
                        route_progress_m=candidate_progress,
                    ),
                    route_progress_m=candidate_progress,
                )
            )
        return candidates

    @staticmethod
    def _fuel_compatible(tags: dict[str, Any], fuel_type: str | None) -> bool:
        """Exclude a station only when OSM explicitly says it lacks this fuel."""
        if fuel_type in {None, "other"}:
            return True
        tag_names = {
            "diesel": ("fuel:diesel",),
            "lpg": ("fuel:lpg", "fuel:propane"),
            "cng": ("fuel:cng", "fuel:compressed_natural_gas"),
            "petrol": ("fuel:octane_95", "fuel:octane_98", "fuel:petrol"),
        }.get(fuel_type, ())
        availability = [tags[name] for name in tag_names if name in tags]
        if not availability:
            return True
        return any(str(value).strip().lower() in {"yes", "true", "1"} for value in availability)

    def _get_json(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        try:
            response = httpx.get(
                f"{self._settings.base_url}{path}",
                params=params,
                headers=self._headers,
                timeout=self._settings.timeout_seconds,
            )
            return self._response_json(response)
        except (httpx.TimeoutException, httpx.RequestError) as error:
            raise ORSProviderUnavailable() from error

    def _post_json(
        self,
        path: str,
        body: dict[str, Any],
        *,
        route_request: bool = False,
    ) -> dict[str, Any]:
        try:
            response = httpx.post(
                f"{self._settings.base_url}{path}",
                json=body,
                headers=self._headers,
                timeout=self._settings.timeout_seconds,
            )
            return self._response_json(response, route_request=route_request)
        except (httpx.TimeoutException, httpx.RequestError) as error:
            raise ORSProviderUnavailable() from error

    def _response_json(
        self, response: httpx.Response, *, route_request: bool = False
    ) -> dict[str, Any]:
        if route_request and response.status_code in {400, 404, 406}:
            raise ORSRouteNotFound()
        if response.status_code == 429 or response.status_code >= 500 or response.status_code in {401, 403}:
            raise ORSProviderUnavailable()
        if not response.is_success:
            raise ORSProviderUnavailable()
        try:
            payload = response.json()
        except ValueError as error:
            raise ORSProviderUnavailable() from error
        if not isinstance(payload, dict):
            raise ORSProviderUnavailable()
        return payload

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self._settings.api_key,
            "Accept": "application/geo+json, application/json",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _finite_number(value: object) -> float | None:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        number = float(value)
        return number if math.isfinite(number) else None

    @classmethod
    def _route_progress_m(
        cls,
        coordinates: list[tuple[float, float]],
        longitude: float,
        latitude: float,
    ) -> float | None:
        if len(coordinates) < 2:
            return None
        cumulative_distance = 0.0
        closest_distance = math.inf
        closest_progress: float | None = None
        previous = coordinates[0]
        for current in coordinates[1:]:
            segment_length = cls._great_circle_distance_m(previous, current)
            distance, fraction = cls._distance_to_segment_m(
                longitude, latitude, previous, current
            )
            if distance < closest_distance:
                closest_distance = distance
                closest_progress = cumulative_distance + segment_length * fraction
            cumulative_distance += segment_length
            previous = current
        return closest_progress

    @staticmethod
    def _great_circle_distance_m(
        first: tuple[float, float], second: tuple[float, float]
    ) -> float:
        earth_radius_m = 6_371_000.0
        first_latitude = math.radians(first[1])
        second_latitude = math.radians(second[1])
        latitude_delta = second_latitude - first_latitude
        longitude_delta = math.radians(second[0] - first[0])
        haversine = (
            math.sin(latitude_delta / 2) ** 2
            + math.cos(first_latitude)
            * math.cos(second_latitude)
            * math.sin(longitude_delta / 2) ** 2
        )
        return 2 * earth_radius_m * math.asin(min(1.0, math.sqrt(haversine)))

    @classmethod
    def _distance_to_segment_m(
        cls,
        longitude: float,
        latitude: float,
        first: tuple[float, float],
        second: tuple[float, float],
    ) -> tuple[float, float]:
        latitude_scale = math.cos(math.radians(latitude))
        point_x = longitude * latitude_scale
        point_y = latitude
        first_x = first[0] * latitude_scale
        first_y = first[1]
        second_x = second[0] * latitude_scale
        second_y = second[1]
        delta_x = second_x - first_x
        delta_y = second_y - first_y
        squared_length = delta_x * delta_x + delta_y * delta_y
        if squared_length == 0:
            fraction = 0.0
        else:
            fraction = max(
                0.0,
                min(
                    1.0,
                    ((point_x - first_x) * delta_x + (point_y - first_y) * delta_y)
                    / squared_length,
                ),
            )
        nearest_x = first_x + fraction * delta_x
        nearest_y = first_y + fraction * delta_y
        latitude_delta = math.radians(point_y - nearest_y)
        longitude_delta = math.radians((point_x - nearest_x) / max(latitude_scale, 1e-12))
        distance = 2 * 6_371_000.0 * math.asin(
            min(
                1.0,
                math.sqrt(
                    math.sin(latitude_delta / 2) ** 2
                    + math.cos(math.radians(latitude))
                    * math.cos(math.radians(nearest_y))
                    * math.sin(longitude_delta / 2) ** 2
                ),
            )
        )
        return distance, fraction
