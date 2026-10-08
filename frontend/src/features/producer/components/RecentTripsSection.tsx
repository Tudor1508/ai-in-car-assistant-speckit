"use client";

import { Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { RecentTripStat } from "../producerTypes";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function RecentTripsSection({ trips }: { trips: RecentTripStat[] }) {
  return (
    <Card variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Recent Saved Trips</Typography>
        <Typography color="text.secondary" sx={{ mt: .5 }}>Only trips explicitly saved by users are included.</Typography>
        {trips.length === 0 ? (
          <Typography role="status" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No saved trips for this brand yet.</Typography>
        ) : (
          <TableContainer sx={{ mt: 2, overflowX: "auto" }}>
            <Table size="medium" aria-label="Recent saved trips for this brand">
              <TableHead><TableRow>
                <TableCell>When</TableCell><TableCell>Route</TableCell><TableCell>Vehicle</TableCell><TableCell align="right">Distance</TableCell>
              </TableRow></TableHead>
              <TableBody>{trips.map((trip, index) => (
                <TableRow key={`${trip.createdAt}-${trip.origin}-${trip.destination}-${index}`}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{dateFormat.format(new Date(trip.createdAt))}</TableCell>
                  <TableCell sx={{ minWidth: 190 }}>{trip.origin} → {trip.destination}</TableCell>
                  <TableCell>{trip.vehicleName} {trip.vehicleModel}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{numberFormat.format(trip.distanceKm)} km</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
