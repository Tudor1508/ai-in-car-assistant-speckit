"use client";

import { Box, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import type { VehicleTypeStat } from "../producerTypes";

function label(type: VehicleTypeStat["vehicleType"]) {
  return type === "electric" ? "Electric" : "Combustion";
}

export function VehicleTypesCard({ rows }: { rows: VehicleTypeStat[] }) {
  const theme = useTheme();
  const total = rows.reduce((sum, row) => sum + row.vehiclesCount, 0);
  const colors = [theme.palette.primary.main, theme.palette.secondary.main];
  let cursor = 0;
  const segments = rows.map((row, index) => {
    const start = cursor;
    cursor += total ? (row.vehiclesCount / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  const gradient = total ? `conic-gradient(${segments.join(", ")})` : `conic-gradient(${theme.palette.action.disabledBackground} 0% 100%)`;

  return (
    <Card variant="outlined" sx={{ height: "100%", bgcolor: "background.paper", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Vehicle Type</Typography>
        <Typography color="text.secondary" sx={{ mt: .5 }}>Active vehicles by type</Typography>
        {total === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No active vehicles are registered for this brand.</Typography> : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: "center", mt: 3 }}>
          <Box role="img" aria-label={`${total} active vehicles by type`} sx={{ width: 188, height: 188, borderRadius: "50%", background: gradient, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Box sx={{ width: 132, height: 132, borderRadius: "50%", bgcolor: "background.paper", display: "grid", placeContent: "center", textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{total}</Typography>
              <Typography variant="caption" color="text.secondary">vehicles</Typography>
            </Box>
          </Box>
          <Stack spacing={2} sx={{ width: "100%" }}>
            {rows.map((row, index) => (
              <Stack key={row.vehicleType} direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colors[index % colors.length], flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{label(row.vehicleType)}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.tripsCount} recorded trips</Typography>
                </Box>
                <Typography sx={{ fontWeight: 800 }}>{row.vehiclesCount}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
