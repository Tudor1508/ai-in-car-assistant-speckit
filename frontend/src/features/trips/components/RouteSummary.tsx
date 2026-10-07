"use client";

import { Alert, Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import type { TripRoutePreview } from "../tripsSlice";

function distance(meters: number) {
  return `${(meters / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining} min` : `${remaining} min`;
}

export function RouteSummary({ preview }: { preview: TripRoutePreview }) {
  const complete = preview.feasibility.status === "complete";
  const routeLabels = preview.route_labels?.length
    ? preview.route_labels
    : preview.route_preference && preview.route_preference !== "all" ? [preview.route_preference] : [];
  const hasScenicRecommendations = routeLabels.includes("scenic");
  const scenicReason = preview.route_choices?.find((choice) => choice.preference === "scenic")?.reason;
  return (
    <Stack spacing={2}>
      <Alert severity={complete ? "success" : "warning"} role="status" sx={!complete ? { bgcolor: "#332b0d", color: "#facc15", "& .MuiAlert-icon": { color: "#facc15" } } : undefined}>
        {complete ? "Traseul poate fi parcurs conform autonomiei estimate." : preview.feasibility.first_unreachable_stop
          ? `Ruta este indisponibilă cu autonomia actuală. Prima ${preview.feasibility.first_unreachable_stop.station_type === "charging" ? "stație de încărcare" : "benzinărie"} este la ${distance((preview.feasibility.next_station_distance_km ?? 0) * 1000)}. Ai nevoie de încă ${preview.feasibility.additional_range_km?.toLocaleString("ro-RO", { maximumFractionDigits: 1 }) ?? "mai multă"} km autonomie pentru a ajunge la ea.`
          : preview.feasibility.message ?? "Planul este incomplet. Verifică autonomia și opririle disponibile."}
      </Alert>
      {routeLabels.length > 0 && <Typography variant="subtitle1">Tip rută: {routeLabels.map((label) => label === "fastest" ? "Fastest" : label === "shortest" ? "Shortest" : "Scenic").join(" · ")}</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
        <Metric label="Distanță" value={distance(preview.route.distance_m)} />
        <Metric label="Timp la volan" value={duration(preview.route.duration_s)} />
        <Metric label="Opriri recomandate" value={String(preview.stops.length + (preview.feasibility.first_unreachable_stop ? 1 : 0))} />
      </Box>
      <Typography variant="caption" color="text.secondary">The estimated time covers driving only. It does not include charging or refueling.</Typography>
      <Divider />
      <Typography variant="h6">Route legs</Typography>
      <Stack spacing={1}>
        {preview.legs.map((leg) => (
          <Box key={leg.sequence} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography>Etapa {leg.sequence}{preview.stops[leg.sequence - 1] ? ` · până la ${preview.stops[leg.sequence - 1].name ?? `oprirea ${leg.sequence}`}` : preview.feasibility.first_unreachable_stop && leg.sequence === preview.stops.length + 1 ? ` · până la ${preview.feasibility.first_unreachable_stop.name ?? "prima stație în afara autonomiei"}` : " · până la destinație"}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{distance(leg.distance_m)}</Typography>
          </Box>
        ))}
      </Stack>
      {preview.stops.length > 0 && (
        <>
          <Divider />
          <Typography variant="h6">Stops</Typography>
          {preview.stops.map((stop) => (
            <Card key={stop.sequence} variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#34495d" }}>
              <CardContent sx={{ py: "12px !important" }}>
                <Typography sx={{ fontWeight: 700 }}>{stop.sequence}. {stop.name ?? (stop.station_type === "charging" ? "Charging station" : "Fuel station")}</Typography>
                <Typography variant="body2" color="text.secondary">{stop.station_type === "charging" ? "Charging" : "Compatible fuel"} · {distance(stop.leg_distance_m)} from the previous leg</Typography>
              </CardContent>
            </Card>
          ))}
        </>
      )}
      {preview.feasibility.first_unreachable_stop && (
        <>
          <Divider />
          <Typography variant="h6">Prima stație în afara autonomiei</Typography>
          <Card variant="outlined" sx={{ bgcolor: "#332b0d", borderColor: "#facc15" }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography sx={{ fontWeight: 700, color: "#facc15" }}>{preview.feasibility.first_unreachable_stop.name ?? (preview.feasibility.first_unreachable_stop.station_type === "charging" ? "Stație de încărcare" : "Benzinărie")}</Typography>
              <Typography variant="body2">{distance((preview.feasibility.next_station_distance_km ?? 0) * 1000)} de la poziția curentă · mai ai nevoie de {preview.feasibility.additional_range_km?.toLocaleString("ro-RO", { maximumFractionDigits: 1 }) ?? "—"} km autonomie</Typography>
            </CardContent>
          </Card>
        </>
      )}
      {hasScenicRecommendations && (
        <>
          <Divider />
          <Typography variant="h6">Atracții recomandate</Typography>
          {(preview.attractions ?? []).length === 0 ? <Typography role="status">{scenicReason && scenicReason !== "no_attractions_found" ? scenicCoverageMessage(scenicReason) : "Nu au fost găsite atracții turistice pe acest traseu."}</Typography> : (preview.attractions ?? []).map((item) => (
            <Card key={`attraction-${item.sequence}`} variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#34495d" }}>
              <CardContent sx={{ py: "12px !important" }}>
                <Typography sx={{ fontWeight: 700 }}>{item.sequence}. {item.name ?? item.category}</Typography>
                <Typography variant="body2" color="text.secondary">{item.category} · {distance(item.route_progress_m)} de la plecare · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Typography>
              </CardContent>
            </Card>
          ))}
          {(preview.restaurants ?? []).length > 0 && <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6">Restaurante recomandate</Typography>
            {(preview.restaurants ?? []).map((item) => (
              <Card key={`restaurant-${item.sequence}`} variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#a855f7" }}>
                <CardContent sx={{ py: "12px !important" }}>
                  <Typography sx={{ fontWeight: 700 }}>{item.sequence}. {item.name ?? "Restaurant recomandat"}</Typography>
                  <Typography variant="body2" color="text.secondary">Restaurant - {distance(item.route_progress_m)} de la plecare - {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Typography>
                </CardContent>
              </Card>
            ))}
          </>}
        </>
      )}
    </Stack>
  );
}

function scenicCoverageMessage(reason: NonNullable<TripRoutePreview["route_choices"]>[number]["reason"]) {
  if (reason === "no_distinct_candidates") return "ORS nu a furnizat o rută alternativă distinctă; Scenic folosește ruta disponibilă.";
  if (reason === "poi_geometry_limit") return "Traseul este disponibil, însă limita serviciului a împiedicat verificarea atracțiilor.";
  if (reason === "poi_results_incomplete") return "Traseul este disponibil, însă lista atracțiilor poate fi incompletă.";
  return "Traseul este disponibil, însă serviciul de atracții nu a răspuns.";
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#34495d" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
  </CardContent></Card>;
}
