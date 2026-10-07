from dataclasses import dataclass
import logging
import math
from typing import Any, Literal

import httpx

from src.trips.schemas import PlaceSuggestion, RouteGeometry, RouteMetrics, RouteStop
from src.trips.settings import TripSettings


logger = logging.getLogger(__name__)

_OPENPOI_MAX_QUERY_AREA_M2 = 50_000_000.0
_OPENPOI_MAX_LINESTRING_LENGTH_M = 500_000.0
_OPENPOI_MAX_SEARCH_RADIUS_M = 2_000.0
_MAX_RECOMMENDATION_DISTANCE_FROM_ROUTE_M = 10_000.0


def scenic_poi_buffer_m(projected_route_length_m: float, configured_corridor_m: float) -> float:
    """Return the largest configured Scenic buffer that fits OpenPOI's area/radius limits."""
    if (
        not math.isfinite(projected_route_length_m)
        or not math.isfinite(configured_corridor_m)
        or projected_route_length_m <= 0
        or configured_corridor_m <= 0
    ):
        raise ScenicComparisonUnavailable("poi_geometry_limit")
    area_limited_buffer_m = _OPENPOI_MAX_QUERY_AREA_M2 / (2 * projected_route_length_m)
    buffer_m = min(configured_corridor_m, _OPENPOI_MAX_SEARCH_RADIUS_M, area_limited_buffer_m)
    if not math.isfinite(buffer_m) or buffer_m <= 0:
        raise ScenicComparisonUnavailable("poi_geometry_limit")
    return buffer_m


class ORSProviderUnavailable(Exception):
    """Raised when the configured ORS service cannot complete a request."""


class ORSRouteNotFound(Exception):
    """Raised when ORS cannot find a route for the requested coordinates."""


class ScenicComparisonUnavailable(Exception):
    """Raised when configured providers cannot compare complete Scenic candidates."""


@dataclass(frozen=True)
class StationCandidate:
    stop: RouteStop
    route_progress_m: float


class ORSProvider:
    # OpenPOI rejects a buffered LineString longer than 500 km. Its measured
    # length reflects projected coordinates, so convert this conservative
    # projected-length target to a latitude-aware geodesic split distance.
    _MAX_POI_PROJECTED_QUERY_LENGTH_M = 400_000.0
    # The public Matrix endpoint limits dynamic source/destination pairs to 25.
    # One source plus 24 candidate destinations stays within that restriction.
    MATRIX_BATCH_SIZE = 24

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

    def directions(
        self, coordinates: list[tuple[float, float]],
        preference: Literal["fastest", "shortest"] | None = None,
    ) -> RouteMetrics:
        if len(coordinates) < 2:
            raise ValueError("Directions require an origin and destination")
        payload = self._post_json(
            "/openrouteservice/v2/directions/driving-car/geojson",
            {
                "coordinates": [[longitude, latitude] for longitude, latitude in coordinates],
                "instructions": False,
                "geometry_simplify": False,
                **({"preference": preference} if preference else {}),
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

    def directions_candidates(
        self, coordinates: list[tuple[float, float]],
        preference: Literal["fastest", "shortest"],
    ) -> list[RouteMetrics]:
        route = self.directions(coordinates, preference)
        candidates = [route]
        # ORS only accepts alternative-route requests for routes <=100 km. If
        # the already-routed primary is longer, use only Fastest/Shortest.
        if route.distance_m > 100_000:
            return candidates
        try:
            payload = self._post_json(
                "/openrouteservice/v2/directions/driving-car/geojson",
                {
                    "coordinates": [[longitude, latitude] for longitude, latitude in coordinates],
                    "instructions": False,
                    "geometry_simplify": False,
                    "preference": preference,
                    "alternative_routes": {"target_count": 3},
                },
                route_request=True,
            )
        except ORSRouteNotFound:
            return candidates
        except ORSProviderUnavailable:
            # The primary route is valid even if the optional alternatives
            # request is rejected or temporarily unavailable.
            return candidates
        features = payload.get("features")
        if not isinstance(features, list):
            raise ORSProviderUnavailable()
        candidates = []
        for feature in features:
            parsed = self._parse_route_feature(feature)
            if parsed is not None and all(parsed.geometry.coordinates != item.geometry.coordinates for item in candidates):
                candidates.append(parsed)
        return candidates or [route]

    def scenic_biased_candidate(
        self, coordinates: list[tuple[float, float]],
    ) -> RouteMetrics | None:
        """Ask ORS for a distinct full route that avoids highways when possible."""
        try:
            payload = self._post_json(
                "/openrouteservice/v2/directions/driving-car/geojson",
                {
                    "coordinates": [[longitude, latitude] for longitude, latitude in coordinates],
                    "instructions": False,
                    "geometry_simplify": False,
                    "options": {"avoid_features": ["highways"]},
                },
                route_request=True,
            )
        except (ORSRouteNotFound, ORSProviderUnavailable):
            return None
        features = payload.get("features")
        if not isinstance(features, list):
            return None
        for feature in features:
            route = self._parse_route_feature(feature)
            if route is not None:
                return route
        return None

    def _parse_route_feature(self, feature: object) -> RouteMetrics | None:
        if not isinstance(feature, dict):
            return None
        geometry_payload = feature.get("geometry")
        properties = feature.get("properties")
        summary = properties.get("summary") if isinstance(properties, dict) else None
        if not isinstance(geometry_payload, dict) or not isinstance(summary, dict):
            return None
        raw_coordinates = geometry_payload.get("coordinates")
        if not isinstance(raw_coordinates, list) or len(raw_coordinates) < 2:
            return None
        coordinates_result = []
        for point in raw_coordinates:
            if not isinstance(point, list) or len(point) < 2:
                return None
            longitude, latitude = self._finite_number(point[0]), self._finite_number(point[1])
            if longitude is None or latitude is None or not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                return None
            coordinates_result.append((longitude, latitude))
        distance_m = self._finite_number(summary.get("distance"))
        duration_s = self._finite_number(summary.get("duration"))
        if distance_m is None or duration_s is None or distance_m <= 0 or duration_s <= 0:
            return None
        return RouteMetrics(geometry=RouteGeometry(type="LineString", coordinates=coordinates_result), distance_m=distance_m, duration_s=duration_s)

    def tourist_attractions_near_route(self, geometry: RouteGeometry) -> list[dict[str, Any]]:
        if self._settings.geoapify_api_key:
            return self._geoapify_places_near_route(
                geometry,
                ["tourism.attraction", "tourism.sights"],
                "attraction",
                route_chunk_length_m=300_000.0,
            )
        # Scenic POIs are queried against each full route. Adapt the tourist
        # buffer to OpenPOI's area limit; never split a route into partial lines.
        length_m = sum(
            self._great_circle_distance_m(first, second)
            for first, second in zip(geometry.coordinates, geometry.coordinates[1:])
        )
        maximum_absolute_latitude = max(abs(latitude) for _, latitude in geometry.coordinates)
        projected_length_m = length_m / max(math.cos(math.radians(maximum_absolute_latitude)), 0.1)
        # OpenPOI measures the submitted LineString in projected coordinates;
        # reject conservatively before sending a request that would return 400.
        if projected_length_m > _OPENPOI_MAX_LINESTRING_LENGTH_M:
            raise ScenicComparisonUnavailable("poi_geometry_limit")
        tourist_buffer_m = scenic_poi_buffer_m(
            projected_length_m, self._settings.poi_corridor_meters
        )
        payload = self._post_json(
            "/openpoiservice/v0/pois",
            {
                "request": "pois",
                "geometry": {"geojson": {"type": geometry.type, "coordinates": geometry.coordinates},
                             "buffer": tourist_buffer_m},
                "limit": self._settings.poi_limit,
                "filters": {"category_ids": list(self._settings.tourist_category_ids)},
            },
        )
        features = payload.get("features")
        if not isinstance(features, list):
            raise ORSProviderUnavailable()
        if len(features) >= self._settings.poi_limit:
            raise ScenicComparisonUnavailable("poi_results_incomplete")
        category_by_id = {622: "attraction", 627: "viewpoint"}
        normalized: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        for feature in features:
            if not isinstance(feature, dict):
                continue
            properties = feature.get("properties")
            point = feature.get("geometry")
            if not isinstance(properties, dict) or not isinstance(point, dict):
                continue
            coords = point.get("coordinates")
            if not isinstance(coords, list) or len(coords) < 2:
                continue
            lon, lat = self._finite_number(coords[0]), self._finite_number(coords[1])
            if lon is None or lat is None or not -180 <= lon <= 180 or not -90 <= lat <= 90:
                continue
            if self._distance_to_route_m(geometry.coordinates, lon, lat) > _MAX_RECOMMENDATION_DISTANCE_FROM_ROUTE_M:
                continue
            raw_category = properties.get("category") or properties.get("category_id")
            raw_categories = properties.get("category_ids")
            if isinstance(raw_category, dict):
                raw_category = raw_category.get("id") or raw_category.get("name")
            values = list(raw_categories) if isinstance(raw_categories, list) else [raw_category]
            category = None
            for value in values:
                if isinstance(value, dict):
                    value = value.get("id") or value.get("name")
                try:
                    category = category_by_id.get(int(value))
                except (ValueError, TypeError):
                    category = str(value).lower() if value else None
                if category in {"attraction", "viewpoint"}:
                    break
            if category not in {"attraction", "viewpoint"}:
                continue
            source_id = properties.get("osm_id", feature.get("id"))
            source_id = str(source_id) if source_id is not None else None
            if source_id and source_id in seen_ids:
                continue
            if source_id:
                seen_ids.add(source_id)
            progress = self._route_progress_m(geometry.coordinates, lon, lat)
            if progress is None:
                continue
            name = properties.get("name")
            tags = properties.get("osm_tags")
            importance = 0.0
            if isinstance(tags, dict):
                important_tags = " ".join(str(value).lower() for key, value in tags.items() if key in {"wikipedia", "wikidata", "heritage", "historic", "tourism"})
                if any(token in important_tags for token in ("wikipedia", "wikidata", "heritage", "museum", "castle", "monument")):
                    importance += 1.0
            if isinstance(name, str) and name.strip():
                importance += 0.01
            normalized.append({"source_id": source_id, "name": name if isinstance(name, str) and name.strip() else None,
                              "category": category, "latitude": lat, "longitude": lon,
                              "route_progress_m": progress, "importance": importance})
        return sorted(normalized, key=lambda item: item["route_progress_m"])

    def restaurants_near_route(self, geometry: RouteGeometry) -> list[dict[str, Any]]:
        if not self._settings.geoapify_api_key:
            return []
        return self._geoapify_places_near_route(
            geometry, ["catering.restaurant"], "restaurant", route_chunk_length_m=400_000.0
        )

    def driving_distances_to(
        self,
        origin: tuple[float, float],
        destinations: list[tuple[float, float]],
    ) -> list[float | None]:
        """Batch candidate reachability checks through ORS Matrix."""
        distances: list[float | None] = []
        for start in range(0, len(destinations), self.MATRIX_BATCH_SIZE):
            batch = destinations[
                start : start + self.MATRIX_BATCH_SIZE
            ]
            payload = self._post_json(
                "/openrouteservice/v2/matrix/driving-car",
                {
                    "locations": [[origin[0], origin[1]]]
                    + [[longitude, latitude] for longitude, latitude in batch],
                    "sources": [0],
                    "destinations": list(range(1, len(batch) + 1)),
                    "metrics": ["distance"],
                },
            )
            matrix = payload.get("distances")
            if not isinstance(matrix, list) or not matrix or not isinstance(matrix[0], list):
                raise ORSProviderUnavailable()
            row = matrix[0]
            if len(row) != len(batch):
                raise ORSProviderUnavailable()
            for value in row:
                if value is None:
                    distances.append(None)
                    continue
                distance = self._finite_number(value)
                if distance is None or distance < 0:
                    raise ORSProviderUnavailable()
                distances.append(distance)
        return distances

    def stations_near_route(
        self,
        geometry: RouteGeometry,
        station_type: Literal["charging", "fuel"],
        fuel_type: str | None = None,
    ) -> list[StationCandidate]:
        if self._settings.geoapify_api_key:
            categories = (
                ["service.vehicle.charging_station"]
                if station_type == "charging"
                else ["service.vehicle.fuel"]
            )
            features = self._geoapify_route_features(geometry, categories)
            candidates: dict[tuple[str, str], StationCandidate] = {}
            for feature in features:
                properties = feature.get("properties")
                point = feature.get("geometry")
                if not isinstance(properties, dict) or not isinstance(point, dict):
                    continue
                coordinates = point.get("coordinates")
                if not isinstance(coordinates, list) or len(coordinates) < 2:
                    continue
                longitude = self._finite_number(coordinates[0])
                latitude = self._finite_number(coordinates[1])
                if longitude is None or latitude is None or not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                    continue
                source = properties.get("datasource")
                raw = source.get("raw") if isinstance(source, dict) else None
                if station_type == "fuel" and isinstance(raw, dict) and not self._fuel_compatible(raw, fuel_type):
                    continue
                source_id = properties.get("place_id") or feature.get("id")
                name = properties.get("name") or (raw.get("name") if isinstance(raw, dict) else None)
                progress = self._route_progress_m(geometry.coordinates, longitude, latitude)
                if progress is None:
                    continue
                stop = RouteStop(
                    sequence=0,
                    provider_id=str(source_id)[:255] if source_id is not None else None,
                    name=name.strip() if isinstance(name, str) and name.strip() else None,
                    station_type=station_type,
                    latitude=latitude,
                    longitude=longitude,
                    leg_distance_m=0,
                    route_progress_m=progress,
                )
                key = ("id", str(source_id)) if source_id is not None else ("coordinates", f"{latitude:.6f}:{longitude:.6f}")
                candidates[key] = StationCandidate(stop=stop, route_progress_m=progress)
            return list(candidates.values())
        category_ids = (
            self._settings.charging_category_ids
            if station_type == "charging"
            else (self._settings.fuel_category_id,)
        )
        maximum_absolute_latitude = max(abs(latitude) for _, latitude in geometry.coordinates)
        projection_scale = 1 / max(
            math.cos(math.radians(maximum_absolute_latitude)), 0.1
        )
        max_geodesic_query_length_m = (
            self._MAX_POI_PROJECTED_QUERY_LENGTH_M / projection_scale
        )
        candidates: dict[tuple[str, str], StationCandidate] = {}
        for query_coordinates in self._split_route_for_poi_queries(
            geometry.coordinates, max_geodesic_query_length_m
        ):
            payload = self._post_json(
                "/openpoiservice/v0/pois",
                {
                    "request": "pois",
                    "geometry": {
                        "geojson": {
                            "type": geometry.type,
                            "coordinates": query_coordinates,
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
                stop = RouteStop(
                    sequence=0,
                    provider_id=str(provider_id) if provider_id is not None else None,
                    name=name.strip() if isinstance(name, str) and name.strip() else None,
                    station_type=station_type,
                    latitude=latitude,
                    longitude=longitude,
                    leg_distance_m=0,
                    route_progress_m=candidate_progress,
                )
                # A station near a chunk boundary may be returned by both
                # requests. Deduplicate by OSM identity, falling back to its
                # coordinates when the provider omits an ID.
                candidate_key = (
                    "id",
                    str(provider_id),
                ) if provider_id is not None else (
                    "coordinates",
                    f"{latitude:.6f}:{longitude:.6f}",
                )
                candidates[candidate_key] = StationCandidate(
                    stop=stop,
                    route_progress_m=candidate_progress,
                )
        return list(candidates.values())

    def _geoapify_places_near_route(
        self,
        geometry: RouteGeometry,
        categories: list[str],
        default_category: str,
        *,
        route_chunk_length_m: float = 400_000.0,
    ) -> list[dict[str, Any]]:
        features = self._geoapify_route_features(
            geometry, categories, route_chunk_length_m=route_chunk_length_m
        )
        normalized: list[dict[str, Any]] = []
        seen: set[str] = set()
        for feature in features:
            properties = feature.get("properties")
            point = feature.get("geometry")
            if not isinstance(properties, dict) or not isinstance(point, dict):
                continue
            coordinates = point.get("coordinates")
            if not isinstance(coordinates, list) or len(coordinates) < 2:
                continue
            longitude, latitude = self._finite_number(coordinates[0]), self._finite_number(coordinates[1])
            if longitude is None or latitude is None or not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                continue
            if self._distance_to_route_m(geometry.coordinates, longitude, latitude) > _MAX_RECOMMENDATION_DISTANCE_FROM_ROUTE_M:
                continue
            source_id = properties.get("place_id") or feature.get("id")
            source_id = str(source_id) if source_id is not None else None
            if source_id and source_id in seen:
                continue
            if source_id:
                seen.add(source_id)
            category_values = properties.get("categories")
            category_text = " ".join(value for value in category_values if isinstance(value, str)) if isinstance(category_values, list) else ""
            category = "viewpoint" if "viewpoint" in category_text else default_category
            rank = properties.get("rank")
            popularity = self._finite_number(rank.get("popularity")) if isinstance(rank, dict) else None
            rank_importance = self._finite_number(rank.get("importance")) if isinstance(rank, dict) else None
            progress = self._route_progress_m(geometry.coordinates, longitude, latitude)
            if progress is None:
                continue
            source = properties.get("datasource")
            raw = source.get("raw") if isinstance(source, dict) else None
            name = properties.get("name") or (raw.get("name") if isinstance(raw, dict) else None)
            raw_text = " ".join(str(value).lower() for key, value in raw.items() if key in {"wikipedia", "wikidata", "heritage", "historic", "tourism"}) if isinstance(raw, dict) else ""
            importance = popularity if popularity is not None else rank_importance or 0.0
            if any(token in raw_text for token in ("wikipedia", "wikidata", "heritage", "museum", "castle", "monument")):
                importance += 1.0
            if isinstance(name, str) and name.strip():
                importance += 0.01
            normalized.append({
                "source_id": source_id,
                "name": name.strip() if isinstance(name, str) and name.strip() else None,
                "category": category,
                "latitude": latitude,
                "longitude": longitude,
                "route_progress_m": progress,
                "importance": importance,
            })
        return sorted(normalized, key=lambda item: item["route_progress_m"])

    def _geoapify_route_features(
        self,
        geometry: RouteGeometry,
        categories: list[str],
        *,
        route_chunk_length_m: float = 400_000.0,
    ) -> list[dict[str, Any]]:
        """Fetch Geoapify places along bounded route sections, deduplicated by place ID."""
        length_chunks = self._split_route_for_poi_queries(geometry.coordinates, route_chunk_length_m)
        # Geoapify caps inline geometries by both position count and serialized
        # size. Keep chunks well below those limits, with one shared endpoint.
        chunks: list[list[tuple[float, float]]] = []
        for length_chunk in length_chunks:
            for start in range(0, len(length_chunk) - 1, 1_999):
                point_chunk = length_chunk[start : start + 2_000]
                if len(point_chunk) >= 2:
                    chunks.append(point_chunk)
        by_id: dict[str, dict[str, Any]] = {}
        for coordinates in chunks:
            body = {
                "categories": categories,
                "filter": {
                    "type": "polyline",
                    "geometry": {"type": "LineString", "coordinates": coordinates},
                    "buffer": min(self._settings.poi_corridor_meters, _MAX_RECOMMENDATION_DISTANCE_FROM_ROUTE_M),
                },
                "limit": min(self._settings.poi_limit, 500),
            }
            try:
                response = httpx.post(
                    "https://api.geoapify.com/v2/places",
                    params={"apiKey": self._settings.geoapify_api_key},
                    json=body,
                    headers={"Accept": "application/geo+json, application/json"},
                    timeout=self._settings.timeout_seconds,
                )
                response.raise_for_status()
                payload = response.json()
            except (httpx.HTTPError, ValueError) as error:
                logger.warning("Geoapify Places request failed: error_type=%s", type(error).__name__)
                raise ORSProviderUnavailable() from error
            features = payload.get("features") if isinstance(payload, dict) else None
            if not isinstance(features, list):
                raise ORSProviderUnavailable()
            for feature in features:
                if not isinstance(feature, dict):
                    continue
                properties = feature.get("properties")
                identifier = properties.get("place_id") if isinstance(properties, dict) else None
                key = str(identifier) if identifier is not None else repr(feature.get("geometry"))
                by_id[key] = feature
        return list(by_id.values())

    @classmethod
    def _split_route_for_poi_queries(
        cls,
        coordinates: list[tuple[float, float]],
        max_length_m: float,
    ) -> list[list[tuple[float, float]]]:
        """Split a route LineString into buffered POI queries under the provider limit."""
        if len(coordinates) < 2:
            return []

        chunks: list[list[tuple[float, float]]] = []
        current_chunk = [coordinates[0]]
        current_chunk_length_m = 0.0

        for endpoint in coordinates[1:]:
            segment_start = current_chunk[-1]
            remaining_segment_m = cls._great_circle_distance_m(segment_start, endpoint)
            if remaining_segment_m == 0:
                continue

            while current_chunk_length_m + remaining_segment_m > max_length_m:
                distance_to_limit_m = max_length_m - current_chunk_length_m
                fraction = distance_to_limit_m / remaining_segment_m
                split_point = (
                    segment_start[0] + (endpoint[0] - segment_start[0]) * fraction,
                    segment_start[1] + (endpoint[1] - segment_start[1]) * fraction,
                )
                current_chunk.append(split_point)
                chunks.append(current_chunk)
                segment_start = split_point
                remaining_segment_m = cls._great_circle_distance_m(segment_start, endpoint)
                current_chunk = [split_point]
                current_chunk_length_m = 0.0

            current_chunk.append(endpoint)
            current_chunk_length_m += remaining_segment_m

        if len(current_chunk) >= 2:
            chunks.append(current_chunk)
        return chunks

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
            return self._response_json(response, path=path, method="GET")
        except (httpx.TimeoutException, httpx.RequestError) as error:
            logger.warning(
                "ORS request failed: method=GET path=%s error_type=%s",
                path,
                type(error).__name__,
            )
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
            return self._response_json(
                response, path=path, method="POST", route_request=route_request
            )
        except (httpx.TimeoutException, httpx.RequestError) as error:
            logger.warning(
                "ORS request failed: method=POST path=%s error_type=%s",
                path,
                type(error).__name__,
            )
            raise ORSProviderUnavailable() from error

    def _response_json(
        self,
        response: httpx.Response,
        *,
        path: str,
        method: str,
        route_request: bool = False,
    ) -> dict[str, Any]:
        if not response.is_success:
            provider_message = self._safe_error_message(response)
            logger.warning(
                "ORS response was not successful: method=%s path=%s status=%s provider_message=%s",
                method,
                path,
                response.status_code,
                provider_message or "unavailable",
            )
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

    def _safe_error_message(self, response: httpx.Response) -> str | None:
        """Extract a short provider error message without logging credentials."""
        try:
            payload = response.json()
        except ValueError:
            return None
        if not isinstance(payload, dict):
            return None
        error = payload.get("error")
        message = error.get("message") if isinstance(error, dict) else payload.get("message")
        if not isinstance(message, str) or not message.strip():
            return None
        safe_message = message.strip().replace(self._settings.api_key, "[redacted]")
        return safe_message[:240]

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

    @classmethod
    def _distance_to_route_m(
        cls,
        coordinates: list[tuple[float, float]],
        longitude: float,
        latitude: float,
    ) -> float:
        """Return the nearest distance from a POI to any route segment."""
        if len(coordinates) < 2:
            return math.inf
        return min(
            cls._distance_to_segment_m(longitude, latitude, first, second)[0]
            for first, second in zip(coordinates, coordinates[1:])
        )

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
