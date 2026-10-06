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
  return (
    <Stack spacing={2}>
      <Alert severity={complete ? "success" : "warning"} role="status">
        {complete ? "This route is feasible within the estimated range." : preview.feasibility.message ?? "The route plan is incomplete. Check the vehicle range and available stops."}
      </Alert>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
        <Metric label="Distance" value={distance(preview.route.distance_m)} />
        <Metric label="Driving time" value={duration(preview.route.duration_s)} />
        <Metric label="Recommended stops" value={String(preview.stops.length)} />
      </Box>
      <Typography variant="caption" color="text.secondary">The estimated time covers driving only. It does not include charging or refueling.</Typography>
      <Divider />
      <Typography variant="h6">Route legs</Typography>
      <Stack spacing={1}>
        {preview.legs.map((leg) => (
          <Box key={leg.sequence} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography>Leg {leg.sequence}{preview.stops[leg.sequence - 1] ? ` · to ${preview.stops[leg.sequence - 1].name ?? `stop ${leg.sequence}`}` : " · to destination"}</Typography>
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
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card variant="outlined" sx={{ bgcolor: "#13263a", borderColor: "#34495d" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
  </CardContent></Card>;
}
