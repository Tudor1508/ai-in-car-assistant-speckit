"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { FleetOverviewCard } from "./FleetOverviewCard";
import { MetricCard } from "./MetricCard";
import { RecentTripsSection } from "./RecentTripsSection";
import { RoutesSection } from "./RoutesSection";
import { VehicleTypesCard } from "./VehicleTypesCard";
import { getProducerReport } from "../producerApi";
import type { ProducerReport } from "../producerTypes";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function ProducerDashboard() {
  const [report, setReport] = useState<ProducerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getProducerReport());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Producer report could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReport(); }, [loadReport]);

  return (
    <Box component="main" sx={{ maxWidth: 1500, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 5 } }}>
      {report ? (
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: 2 }}>Partner Insights</Typography>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.5rem" }, fontWeight: 900, lineHeight: 1.05, mt: 1 }}>{report.companyName}</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>Understand your brand&apos;s vehicle footprint and saved trip activity across Drivewise.</Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: 2 }}>Partner Insights</Typography>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.5rem" }, fontWeight: 900, mt: 1 }}>Producer Dashboard</Typography>
        </Box>
      )}

      {error ? <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void loadReport()}>Retry</Button>} sx={{ mb: 3 }}>{error}</Alert> : null}
      {loading && !report ? (
        <Box role="status" aria-live="polite" sx={{ minHeight: 280, display: "grid", placeItems: "center" }}>
          <Box sx={{ display: "grid", justifyItems: "center", gap: 1.5 }}><CircularProgress /><Typography color="text.secondary">Loading brand insights…</Typography></Box>
        </Box>
      ) : null}
      {report ? (
        <>
          {loading ? <Alert severity="info" role="status" sx={{ mb: 2 }}>Refreshing brand insights…</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }, gap: 2, mb: 3 }}>
            <MetricCard title="Current users" value={String(report.usersCount)} description={`${report.activeUsersCount} users have an active account.`} />
            <MetricCard title="Active vehicles" value={String(report.vehiclesCount)} description="Currently available vehicles of your brand." />
            <MetricCard title="Vehicles registered ever" value={String(report.historicalVehiclesCount)} description="Active and archived vehicles retained in history." />
            <MetricCard title="Recorded trips" value={String(report.tripsCount)} description="Trips explicitly saved by users." />
            <MetricCard title="Reported distance" value={`${numberFormat.format(report.totalDistanceKm)} km`} description="Sum of saved route distances." />
          </Box>
          {report.vehiclesCount === 0 ? <Alert severity="info" role="status" sx={{ mb: 3 }}>No active vehicles are associated with {report.companyName} yet.</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, .9fr) minmax(0, 1.1fr)" }, gap: 3, mb: 3 }}>
            <VehicleTypesCard rows={report.vehicleTypes} />
            <FleetOverviewCard active={report.vehiclesCount} allTime={report.historicalVehiclesCount} users={report.usersCount} timeline={report.fleetTimeline} />
          </Box>
          <Box sx={{ display: "grid", gap: 3 }}>
            <RoutesSection routes={report.routes} vehicleTopRoutes={report.vehicleTopRoutes} companyName={report.companyName} />
            <RecentTripsSection trips={report.recentTrips} />
          </Box>
        </>
      ) : null}
    </Box>
  );
}
