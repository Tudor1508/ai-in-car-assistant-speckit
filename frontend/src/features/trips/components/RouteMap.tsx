"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box } from "@mui/material";
import { divIcon, svg, type Polyline as LeafletPolyline } from "leaflet";
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { TripRoutePreview, PlaceSelection } from "../tripsSlice";

type Props = { preview: TripRoutePreview; origin: PlaceSelection; destination: PlaceSelection; height?: number | string; mapLabel?: string };
const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
const markerRenderer = svg({ padding: 0.5 });

function poiIcon(kind: "fuel" | "charging" | "attraction" | "restaurant") {
  const emoji = { fuel: "⛽", charging: "⚡", attraction: "🏛️", restaurant: "🍽️" }[kind];
  const color = { fuel: "#dc2626", charging: "#eab308", attraction: "#6b7280", restaurant: "#a855f7" }[kind];
  return divIcon({ className: `drivewise-poi-icon drivewise-poi-icon-${kind}`, html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 5px #0008;font-size:14px;line-height:1">${emoji}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function FitRoute({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 }); }, [bounds, map]);
  return null;
}

function endpointIcon(kind: "start" | "finish", bearingDegrees = 0) {
  if (kind === "start") {
    const combustionCar = `<path fill="#dc2626" stroke="#7f1d1d" stroke-width="1" d="M8 1.5h8c2 0 3.3 1.5 3.7 3.5l1 6v17c0 3.8-2.4 6.5-5.3 6.5H8.6c-2.9 0-5.3-2.7-5.3-6.5V11l1-6c.4-2 1.7-3.5 3.7-3.5Z"/><path fill="#fca5a5" d="M7.5 4h9l1.2 5.3H6.3z"/><path fill="#172554" stroke="#fecaca" stroke-width=".6" d="M6.1 10.5h11.8v7.4H6.1zm.8 9h10.2v4H6.9z"/><path fill="#7f1d1d" d="M7 28.7h10v1.3H7z"/>`;
    const car = `<svg viewBox="0 0 24 36" width="24" height="36" aria-hidden="true" style="display:block;transform:rotate(${bearingDegrees}deg);filter:drop-shadow(0 1px 2px #0009)"><path fill="#171717" d="M3 8h3v7H3zm15 0h3v7h-3zM3 22h3v7H3zm15 0h3v7h-3z"/>${combustionCar}<path fill="#fef08a" stroke="#713f12" stroke-width=".5" d="M4.2 5.4h2v2h-2zm13.6 0h2v2h-2z"/></svg>`;
    return divIcon({
      className: "drivewise-endpoint-icon drivewise-endpoint-start",
      html: car,
      iconSize: [27, 38],
      iconAnchor: [13.5, 19],
    });
  }
  const color = "#f97316";
  const graphic = "📍";
  return divIcon({
    className: `drivewise-endpoint-icon drivewise-endpoint-${kind}`,
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px #0009;font-size:16px;line-height:1">${graphic}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function distanceBetweenMeters(first: [number, number], second: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;
  const latitudeDelta = radians(secondLatitude - firstLatitude);
  const longitudeDelta = radians(secondLongitude - firstLongitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(firstLatitude)) * Math.cos(radians(secondLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeUntilRange(coordinates: [number, number][], rangeKm: number, routeDistanceM: number): [number, number][] {
  if (coordinates.length < 2 || rangeKm <= 0) return [];
  const geometryDistanceM = coordinates.slice(1).reduce(
    (total, point, index) => total + distanceBetweenMeters(coordinates[index], point),
    0,
  );
  if (geometryDistanceM <= 0) return [];
  const targetMeters = Math.min(geometryDistanceM, rangeKm * 1000 * geometryDistanceM / Math.max(routeDistanceM, 1));
  const result: [number, number][] = [[coordinates[0][1], coordinates[0][0]]];
  let traveledMeters = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const segmentMeters = distanceBetweenMeters(previous, current);
    if (traveledMeters + segmentMeters >= targetMeters) {
      const fraction = segmentMeters === 0 ? 0 : (targetMeters - traveledMeters) / segmentMeters;
      result.push([
        previous[1] + (current[1] - previous[1]) * fraction,
        previous[0] + (current[0] - previous[0]) * fraction,
      ]);
      return result;
    }
    result.push([current[1], current[0]]);
    traveledMeters += segmentMeters;
  }
  return result;
}

function AnimatedRangeLine({ positions }: { positions: [number, number][] }) {
  const lineRef = useRef<LeafletPolyline | null>(null);
  useEffect(() => {
    const path = lineRef.current?.getElement() as SVGPathElement | undefined;
    if (!path || typeof path.getTotalLength !== "function" || typeof path.animate !== "function") return;
    const pathLength = path.getTotalLength();
    if (!Number.isFinite(pathLength) || pathLength <= 0) return;
    path.style.strokeDasharray = String(pathLength);
    const animation = path.animate(
      [{ strokeDashoffset: String(pathLength) }, { strokeDashoffset: "0" }],
      { duration: 3200, iterations: Infinity, easing: "linear" },
    );
    return () => animation.cancel();
  }, [positions]);

  if (positions.length < 2) return null;
  return <Polyline ref={lineRef} positions={positions} pathOptions={{ color: "#f97316", weight: 8, opacity: 1, lineCap: "round", lineJoin: "round", className: "current-range-route" }} />;
}

export default function RouteMap({ preview, origin, destination, height, mapLabel = "Map showing the planned route" }: Props) {
  const [tileFailed, setTileFailed] = useState(!tileUrl || !attribution);
  const points = preview.route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
  const rangePositions = useMemo(
    () => preview.feasibility.status === "incomplete"
      ? routeUntilRange(preview.route.geometry.coordinates, preview.vehicle.available_range_km, preview.route.distance_m)
      : [],
    [preview.feasibility.status, preview.route.geometry.coordinates, preview.vehicle.available_range_km],
  );
  const bounds: LatLngBoundsExpression = points.length ? points : [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]];
  const center: [number, number] = [origin.latitude, origin.longitude];
  const initialBearing = preview.route.geometry.coordinates.length > 1
    ? (() => {
      const [longitude1, latitude1] = preview.route.geometry.coordinates[0];
      const [longitude2, latitude2] = preview.route.geometry.coordinates[1];
      const radians = (degrees: number) => degrees * Math.PI / 180;
      const latitude1Rad = radians(latitude1);
      const latitude2Rad = radians(latitude2);
      const longitudeDelta = radians(longitude2 - longitude1);
      const y = Math.sin(longitudeDelta) * Math.cos(latitude2Rad);
      const x = Math.cos(latitude1Rad) * Math.sin(latitude2Rad)
        - Math.sin(latitude1Rad) * Math.cos(latitude2Rad) * Math.cos(longitudeDelta);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    })()
    : 0;

  return (
    <Box sx={{ height: height ?? { xs: 320, md: 460 }, borderRadius: 3, overflow: "hidden", border: "1px solid #33495b", position: "relative" }} role="region" aria-label={mapLabel}>
      {tileUrl && attribution && !tileFailed && <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }} attributionControl={false} preferCanvas>
        <TileLayer url={tileUrl} attribution={attribution} keepBuffer={0} updateWhenIdle={false} updateWhenZooming={false} eventHandlers={{ tileerror: () => setTileFailed(true) }} />
        <AttributionControl position="bottomright" prefix={false} />
        {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#24c9df", weight: 5, opacity: 0.9 }} />}
        <AnimatedRangeLine positions={rangePositions} />
        <Marker position={[origin.latitude, origin.longitude]} icon={endpointIcon("start", initialBearing)} keyboard title={`Plecare: ${origin.label}`}>
          <Popup>Plecare: {origin.label}</Popup>
        </Marker>
        <Marker position={[destination.latitude, destination.longitude]} icon={endpointIcon("finish")} keyboard title={`Destinație: ${destination.label}`}>
          <Popup>Destinație: {destination.label}</Popup>
        </Marker>
        {preview.stops.map((stop) => (
          <Fragment key={`${stop.sequence}-${stop.provider_id ?? stop.latitude}`}>
            <CircleMarker center={[stop.latitude, stop.longitude]} radius={6} renderer={markerRenderer} pathOptions={{ color: "#fff", fillColor: stop.station_type === "charging" ? "#eab308" : "#dc2626", fillOpacity: 1, className: `energy-stop-marker energy-stop-type-${stop.station_type} energy-stop-sequence-${stop.sequence}` }}>
              <Tooltip direction="top">Oprirea {stop.sequence}: {stop.name ?? (stop.station_type === "charging" ? "Statie de incarcare" : "Benzinarie")}</Tooltip>
            </CircleMarker>
            <Marker position={[stop.latitude, stop.longitude]} icon={poiIcon(stop.station_type)} keyboard title={stop.name ?? (stop.station_type === "charging" ? "Statie de incarcare" : "Benzinarie")} />
          </Fragment>
        ))}
        {preview.feasibility.first_unreachable_stop && (() => {
          const stop = preview.feasibility.first_unreachable_stop!;
          const title = stop.name ?? (stop.station_type === "charging" ? "Prima stație de încărcare în afara autonomiei" : "Prima benzinărie în afara autonomiei");
          const extra = preview.feasibility.additional_range_km?.toLocaleString("ro-RO", { maximumFractionDigits: 1 }) ?? "?";
          return <Fragment key={`unreachable-${stop.provider_id ?? stop.latitude}`}>
            <CircleMarker center={[stop.latitude, stop.longitude]} radius={11} renderer={markerRenderer} pathOptions={{ color: "#facc15", weight: 4, fillColor: stop.station_type === "charging" ? "#eab308" : "#dc2626", fillOpacity: 1, className: "energy-stop-unreachable" }}>
              <Tooltip direction="top">{title} · ai nevoie de încă {extra} km autonomie</Tooltip>
            </CircleMarker>
            <Marker position={[stop.latitude, stop.longitude]} icon={poiIcon(stop.station_type)} keyboard title={`${title} · încă ${extra} km autonomie necesară`} />
          </Fragment>;
        })()}
        {(preview.attractions ?? []).map((attraction) => (
          <Fragment key={`attraction-${attraction.sequence}`}>
            <CircleMarker center={[attraction.latitude, attraction.longitude]} radius={6} renderer={markerRenderer} pathOptions={{ color: "#fff", fillColor: "#6b7280", fillOpacity: 1, className: `tourist-attraction-marker tourist-category-${attraction.category} tourist-sequence-${attraction.sequence}` }}>
              <Tooltip direction="top">Atractia {attraction.sequence}: {attraction.name ?? attraction.category}</Tooltip>
            </CircleMarker>
            <Marker position={[attraction.latitude, attraction.longitude]} icon={poiIcon("attraction")} keyboard title={attraction.name ?? "Atractie turistica"} />
          </Fragment>
        ))}
        {(preview.restaurants ?? []).map((restaurant) => (
          <Fragment key={`restaurant-${restaurant.sequence}`}>
            <CircleMarker center={[restaurant.latitude, restaurant.longitude]} radius={6} renderer={markerRenderer} pathOptions={{ color: "#fff", fillColor: "#a855f7", fillOpacity: 1, className: `restaurant-marker restaurant-sequence-${restaurant.sequence}` }}>
              <Tooltip direction="top">Restaurant {restaurant.sequence}: {restaurant.name ?? "Restaurant recomandat"}</Tooltip>
            </CircleMarker>
            <Marker position={[restaurant.latitude, restaurant.longitude]} icon={poiIcon("restaurant")} keyboard title={restaurant.name ?? "Restaurant recomandat"} />
          </Fragment>
        ))}
        <FitRoute bounds={bounds} />
      </MapContainer>
      }
      {tileFailed && <Alert severity="warning" role="status" sx={{ position: "absolute", inset: 0, zIndex: 1000, borderRadius: 0, alignItems: "center", justifyContent: "center", bgcolor: "rgba(16,34,53,.94)" }}>The route map is temporarily unavailable. Trip details are still available.</Alert>}
    </Box>
  );
}
