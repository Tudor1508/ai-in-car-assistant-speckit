"use client";

import { Box, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { RouteStat, VehicleTopRouteStat } from "../producerTypes";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function RoutesSection({ routes, vehicleTopRoutes, companyName }: { routes: RouteStat[]; vehicleTopRoutes: VehicleTopRouteStat[]; companyName: string }) {
  return (
    <Card variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Most Used Routes</Typography>
            <Typography color="text.secondary" sx={{ mt: .5 }}>Saved trips across {companyName} vehicles.</Typography>
          </Box>
          <Chip variant="outlined" label={`${routes.length} route${routes.length === 1 ? "" : "s"}`} />
        </Stack>
        {routes.length === 0 ? (
          <Typography role="status" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No saved routes for this brand yet.</Typography>
        ) : (
          <TableContainer sx={{ mt: 2, overflowX: "auto" }}>
            <Table size="medium" aria-label="Most used brand routes">
              <TableHead><TableRow>
                <TableCell>Route</TableCell><TableCell align="right">Trips</TableCell><TableCell align="right">Distance</TableCell><TableCell align="right">Vehicles</TableCell><TableCell align="right">Users</TableCell>
              </TableRow></TableHead>
              <TableBody>{routes.map((route) => (
                <TableRow key={`${route.origin.toLocaleLowerCase()}-${route.destination.toLocaleLowerCase()}`}>
                  <TableCell sx={{ minWidth: 230 }}>
                    <Typography sx={{ fontWeight: 700 }}>{route.origin} → {route.destination}</Typography>
                    {route.vehicles.slice(0, 2).map((vehicle) => (
                      <Typography key={`${vehicle.name}-${vehicle.model}`} variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {vehicle.name} {vehicle.model} used this route most: {vehicle.tripsCount} trips · {numberFormat.format(vehicle.totalDistanceKm)} km
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell align="right">{route.tripsCount}</TableCell>
                  <TableCell align="right">{numberFormat.format(route.totalDistanceKm)} km</TableCell>
                  <TableCell align="right">{route.vehicleCount}</TableCell>
                  <TableCell align="right">{route.uniqueUsersCount}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
        )}
        {vehicleTopRoutes.length > 0 ? (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Most Used Route by Vehicle</Typography>
            <Stack spacing={1}>
              {vehicleTopRoutes.map((item) => (
                <Stack key={`${item.vehicleName}-${item.vehicleModel}-${item.origin}-${item.destination}`} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .25, sm: 1 }} sx={{ justifyContent: "space-between", py: 1, borderTop: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontWeight: 700 }}>{item.vehicleName} {item.vehicleModel}</Typography>
                  <Typography color="text.secondary">{item.origin} → {item.destination}</Typography>
                  <Typography variant="body2">{item.tripsCount} trips · {numberFormat.format(item.totalDistanceKm)} km</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
