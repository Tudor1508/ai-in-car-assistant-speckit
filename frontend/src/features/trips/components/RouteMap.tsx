"use client";

import { useEffect } from "react";
import { Alert, Box } from "@mui/material";
import { AttributionControl, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { TripRoutePreview, PlaceSelection } from "../tripsSlice";

type Props = { preview: TripRoutePreview; origin: PlaceSelection; destination: PlaceSelection };
const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;

function FitRoute({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 }); }, [bounds, map]);
  return null;
}

export default function RouteMap({ preview, origin, destination }: Props) {
  if (!tileUrl || !attribution) {
    return <Alert severity="error">Map configuration is missing. Check NEXT_PUBLIC_MAP_TILE_URL and NEXT_PUBLIC_MAP_ATTRIBUTION.</Alert>;
  }
  const points = preview.route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
  const bounds: LatLngBoundsExpression = points.length ? points : [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]];
  const center: [number, number] = [origin.latitude, origin.longitude];

  return (
    <Box sx={{ height: { xs: 320, md: 460 }, borderRadius: 3, overflow: "hidden", border: "1px solid #33495b" }} aria-label="Map showing the planned route">
      <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }} attributionControl={false} preferCanvas>
        <TileLayer url={tileUrl} attribution={attribution} keepBuffer={0} updateWhenIdle={false} updateWhenZooming={false} />
        <AttributionControl position="bottomright" prefix={false} />
        {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#24c9df", weight: 5, opacity: 0.9 }} />}
        <CircleMarker center={[origin.latitude, origin.longitude]} radius={8} pathOptions={{ color: "#fff", fillColor: "#22c55e", fillOpacity: 1 }}><Tooltip permanent direction="top">Plecare: {origin.label}</Tooltip></CircleMarker>
        <CircleMarker center={[destination.latitude, destination.longitude]} radius={8} pathOptions={{ color: "#fff", fillColor: "#f97316", fillOpacity: 1 }}><Tooltip permanent direction="top">Destination: {destination.label}</Tooltip></CircleMarker>
        {preview.stops.map((stop) => (
          <CircleMarker key={`${stop.sequence}-${stop.provider_id ?? stop.latitude}`} center={[stop.latitude, stop.longitude]} radius={7} pathOptions={{ color: "#fff", fillColor: "#8b5cf6", fillOpacity: 1 }}>
            <Tooltip direction="top">Stop {stop.sequence}: {stop.name ?? (stop.station_type === "charging" ? "Charging station" : "Fuel station")}</Tooltip>
          </CircleMarker>
        ))}
        <FitRoute bounds={bounds} />
      </MapContainer>
    </Box>
  );
}
