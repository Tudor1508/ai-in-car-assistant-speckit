"use client";

import { Box, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import type { FleetTimelinePoint } from "../producerTypes";

export function FleetOverviewCard({ active, allTime, users, timeline }: {
  active: number;
  allTime: number;
  users: number;
  timeline: FleetTimelinePoint[];
}) {
  const max = Math.max(allTime, 1);
  return (
    <Card variant="outlined" sx={{ height: "100%", bgcolor: "background.paper", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Fleet Overview</Typography>
        <Typography color="text.secondary" sx={{ mt: .5 }}>Active and all-time vehicles registered to the brand.</Typography>
        <Stack spacing={2.5} sx={{ mt: 3 }}>
          <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
              <Typography>Active vehicles</Typography><Typography sx={{ fontWeight: 800 }}>{active}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={max ? Math.min(100, active / max * 100) : 0} aria-label={`Active vehicles: ${active}`} sx={{ height: 12, borderRadius: 8, bgcolor: "action.disabledBackground", "& .MuiLinearProgress-bar": { borderRadius: 8 } }} />
          </Box>
          <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
              <Typography>All time vehicles</Typography><Typography sx={{ fontWeight: 800 }}>{allTime}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={allTime > 0 ? 100 : 0} aria-label={`All time vehicles: ${allTime}`} color="secondary" sx={{ height: 12, borderRadius: 8, bgcolor: "action.disabledBackground", "& .MuiLinearProgress-bar": { borderRadius: 8 } }} />
          </Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Typography color="text.secondary">Users with brand vehicles</Typography><Typography sx={{ fontWeight: 800 }}>{users}</Typography>
          </Stack>
        </Stack>
        {timeline.length > 1 ? (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Fleet over time</Typography>
            <Stack spacing={1}>
              {timeline.map((point) => (
                <Stack key={point.month} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 58, flexShrink: 0 }}>{point.month}</Typography>
                  <LinearProgress variant="determinate" value={point.allTimeVehicles ? point.activeVehicles / Math.max(...timeline.map((item) => item.allTimeVehicles), 1) * 100 : 0} aria-label={`${point.month} active fleet ${point.activeVehicles}`} sx={{ flex: 1, height: 8, borderRadius: 8 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: "right" }}>{point.activeVehicles}/{point.allTimeVehicles}</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Active / registered by month</Typography>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
