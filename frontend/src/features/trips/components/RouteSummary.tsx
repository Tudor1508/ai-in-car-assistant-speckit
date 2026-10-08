"use client";

import { Alert, Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import type { PlaceSelection, TripRoutePreview } from "../tripsSlice";

function distance(meters: number) {
  return `${(meters / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining} min` : `${remaining} min`;
}

export function RouteSummary({ preview, origin, destination }: { preview: TripRoutePreview; origin: PlaceSelection; destination: PlaceSelection }) {
  const complete = preview.feasibility.status === "complete";
  const routeLabels = preview.route_labels?.length
    ? preview.route_labels
    : preview.route_preference && preview.route_preference !== "all" ? [preview.route_preference] : [];
  const hasScenicRecommendations = routeLabels.includes("scenic");
  const scenicReason = preview.route_choices?.find((choice) => choice.preference === "scenic")?.reason;

  return (
    <Stack spacing={2.5}>
      <Alert severity={complete ? "success" : "warning"} role="status" sx={!complete ? { bgcolor: "warning.light", color: "warning.contrastText" } : undefined}>
        {complete ? "This route is within the vehicle's estimated range." : preview.feasibility.first_unreachable_stop
          ? `This route exceeds the current range. The first ${preview.feasibility.first_unreachable_stop.station_type === "charging" ? "charging station" : "fuel station"} is ${distance((preview.feasibility.next_station_distance_km ?? 0) * 1000)} away. You need ${preview.feasibility.additional_range_km?.toLocaleString("en-US", { maximumFractionDigits: 1 }) ?? "more"} km of range to reach it.`
          : preview.feasibility.message ?? "The route is incomplete. Check the vehicle range and available stops."}
      </Alert>

      {routeLabels.length > 0 && (
        <Typography variant="subtitle1">
          Route type: {routeLabels.map((label) => label === "fastest" ? "Fastest" : label === "shortest" ? "Shortest" : "Scenic").join(" · ")}
        </Typography>
      )}

      <Card variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider" }}>
        <CardContent sx={{ py: "12px !important" }}>
          <Typography variant="overline" color="text.secondary">Route endpoints</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
            <Box><Typography variant="caption" color="text.secondary">Origin</Typography><Typography sx={{ fontWeight: 700 }}>{origin.label}</Typography></Box>
            <Box sx={{ textAlign: { sm: "right" } }}><Typography variant="caption" color="text.secondary">Destination</Typography><Typography sx={{ fontWeight: 700 }}>{destination.label}</Typography></Box>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
        <Metric label="Distance" value={distance(preview.route.distance_m)} />
        <Metric label="Driving time" value={duration(preview.route.duration_s)} />
        <Metric label="Recommended stops" value={String(preview.stops.length + (preview.feasibility.first_unreachable_stop ? 1 : 0))} />
      </Box>

      <Typography variant="caption" color="text.secondary">Estimated time covers driving only. It does not include charging or refueling.</Typography>

      <Divider />
      <Typography variant="h6">Route legs</Typography>
      <Stack component="ol" spacing={1} sx={{ listStyle: "none", p: 0, m: 0 }} aria-label="Ordered route legs">
        {preview.legs.map((leg) => (
          <Box component="li" key={leg.sequence} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.default" }}>
            <Typography>
              Leg {leg.sequence}{preview.stops[leg.sequence - 1]
                ? ` · to ${preview.stops[leg.sequence - 1].name ?? `stop ${leg.sequence}`}`
                : preview.feasibility.first_unreachable_stop && leg.sequence === preview.stops.length + 1
                  ? ` · to ${preview.feasibility.first_unreachable_stop.name ?? "first unreachable station"}`
                  : ` · to ${destination.label}`}
            </Typography>
            <Typography sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{distance(leg.distance_m)}</Typography>
          </Box>
        ))}
      </Stack>

      {preview.stops.length > 0 && (
        <>
          <Divider />
          <Typography variant="h6">Recommended stops</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
            {preview.stops.map((stop) => (
              <Card key={stop.sequence} variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider" }}>
                <CardContent sx={{ py: "12px !important" }}>
                  <Typography sx={{ fontWeight: 700 }}>{stop.sequence}. {stop.name ?? (stop.station_type === "charging" ? "Charging station" : "Fuel station")}</Typography>
                  <Typography variant="body2" color="text.secondary">{stop.station_type === "charging" ? "Charging" : "Compatible fuel"} · {distance(stop.leg_distance_m)} from the previous leg</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {preview.feasibility.first_unreachable_stop && (
        <>
          <Divider />
          <Typography variant="h6">First station beyond current range</Typography>
          <Card variant="outlined" sx={{ bgcolor: "warning.light", color: "warning.contrastText", borderColor: "warning.main" }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography sx={{ fontWeight: 700, color: "#facc15" }}>{preview.feasibility.first_unreachable_stop.name ?? (preview.feasibility.first_unreachable_stop.station_type === "charging" ? "Charging station" : "Fuel station")}</Typography>
              <Typography variant="body2">{distance((preview.feasibility.next_station_distance_km ?? 0) * 1000)} from your current position · {preview.feasibility.additional_range_km?.toLocaleString("en-US", { maximumFractionDigits: 1 }) ?? "—"} km of additional range needed</Typography>
            </CardContent>
          </Card>
        </>
      )}

      {hasScenicRecommendations && (
        <>
          <Divider />
          <Typography variant="h6">Recommended attractions</Typography>
          {(preview.attractions ?? []).length === 0 ? (
            <Typography role="status">{scenicReason && scenicReason !== "no_attractions_found" ? scenicCoverageMessage(scenicReason) : "No tourist attractions were found along this route."}</Typography>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
              {(preview.attractions ?? []).map((item) => (
                <Card key={`attraction-${item.sequence}`} variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider" }}>
                  <CardContent sx={{ py: "12px !important" }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.sequence}. {item.name ?? item.category}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.category} · {distance(item.route_progress_m)} from origin · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          {(preview.restaurants ?? []).length > 0 && <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6">Recommended restaurants</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
              {(preview.restaurants ?? []).map((item) => (
                <Card key={`restaurant-${item.sequence}`} variant="outlined" sx={{ bgcolor: "background.default", borderColor: "secondary.main" }}>
                  <CardContent sx={{ py: "12px !important" }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.sequence}. {item.name ?? "Recommended restaurant"}</Typography>
                    <Typography variant="body2" color="text.secondary">Restaurant · {distance(item.route_progress_m)} from origin · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>}
        </>
      )}
    </Stack>
  );
}

function scenicCoverageMessage(reason: NonNullable<TripRoutePreview["route_choices"]>[number]["reason"]) {
  if (reason === "no_distinct_candidates") return "ORS did not provide a distinct alternative route, so Scenic uses the available route.";
  if (reason === "poi_geometry_limit") return "The route is available, but a service limit prevented attraction checks.";
  if (reason === "poi_results_incomplete") return "The route is available, but the attraction list may be incomplete.";
  return "The route is available, but the attraction service did not respond.";
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card variant="outlined" sx={{ bgcolor: "background.default", borderColor: "divider" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
  </CardContent></Card>;
}
