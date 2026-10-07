"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { ApiClientError, setCsrfToken } from "@/lib/api/client";
import { authCleared } from "@/features/auth/authSlice";
import { listTripHistory } from "../tripsApi";
import { historyFailed, historyLoaded, historyLoading, historyPageChanged, historySortChanged } from "../tripsSlice";
import { TripHistoryCard } from "./TripHistoryCard";

export function TripHistoryPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const state = useSelector((root: RootState) => root.trips);
  const page = state.historyPagination.page;
  const sort = state.historySort;

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    dispatch(historyLoading());
    try {
      const result = await listTripHistory(page, 10, sort);
      if (!isCurrent()) return;
      if (result.pagination.total_pages > 0 && page > result.pagination.total_pages) {
        dispatch(historyPageChanged(result.pagination.total_pages));
        return;
      }
      if (result.pagination.total_pages === 0 && page !== 1) {
        dispatch(historyPageChanged(1));
        return;
      }
      dispatch(historyLoaded(result));
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiClientError && error.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(historyFailed(error instanceof Error ? error.message : "Trip history could not be loaded."));
    }
  }, [dispatch, page, sort, router]);

  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => { current = false; };
  }, [load]);

  const summary = state.historySummary;
  const totalDistance = `${(summary.total_distance_m / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
  const minutes = Math.round(summary.total_duration_s / 60);
  const driveTime = `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

  return (
    <Box component="main" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "background.default", color: "text.primary", px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ width: "100%", maxWidth: 880, mx: "auto" }}>
        <Box sx={{ maxWidth: 480, mb: 3 }}>
          <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 2 }}>YOUR JOURNEYS</Typography>
          <Typography variant="h3" sx={{ fontWeight: 850, fontSize: { xs: "2.1rem", sm: "2.5rem" } }}>Trip history<span style={{ color: "var(--mui-palette-primary-main)" }}>.</span></Typography>
          <Typography color="text.secondary" sx={{ mt: .5 }}>A calm overview of the routes you have planned, the vehicles you drove, and the time spent on the road.</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mb: 2 }}>
          <Summary label="Journeys planned" value={String(summary.total_trips)} icon="↕" />
          <Summary label="Total distance" value={totalDistance} icon="◧" />
          <Summary label="Estimated driving time" value={driveTime} icon="◷" />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Typography variant="subtitle2">{summary.total_trips} {summary.total_trips === 1 ? "journey" : "journeys"}</Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="trip-history-sort-label">Sort trips</InputLabel>
            <Select labelId="trip-history-sort-label" label="Sort trips" value={sort} onChange={(event) => dispatch(historySortChanged(event.target.value as "desc" | "asc"))}>
              <MenuItem value="desc">Newest first</MenuItem><MenuItem value="asc">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {state.historyStatus === "loading" && <Box role="status" sx={{ py: 8, display: "grid", justifyItems: "center", gap: 1 }}><CircularProgress aria-label="Loading trip history" /><Typography>Loading trip history...</Typography></Box>}
        {state.historyStatus === "failed" && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>{state.historyError ?? "Trip history could not be loaded."}</Alert>}
        {state.historyStatus === "succeeded" && summary.total_trips === 0 && <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: 4 }}><CardContent sx={{ textAlign: "center", py: 6 }}><Typography variant="h5" sx={{ fontWeight: 800 }}>No trips saved yet</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Plan a route and save it to see it here.</Typography><Button href="/trip" variant="contained" sx={{ mt: 2 }}>Plan a trip</Button></CardContent></Card>}
        {state.historyStatus === "succeeded" && state.historyItems.length > 0 && <Stack spacing={1.5}>{state.historyItems.map((trip, index) => <TripHistoryCard key={trip.id} trip={trip} index={(page - 1) * 10 + index + 1} />)}</Stack>}
        {state.historyStatus === "succeeded" && state.historyPagination.total_pages > 1 && <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 3 }}><Button variant="outlined" disabled={page <= 1} onClick={() => dispatch(historyPageChanged(page - 1))}>Previous</Button><Typography aria-live="polite">Page {page} of {state.historyPagination.total_pages}</Typography><Button variant="outlined" disabled={page >= state.historyPagination.total_pages} onClick={() => dispatch(historyPageChanged(page + 1))}>Next</Button></Box>}
      </Box>
    </Box>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: 5 }}><CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, "&:last-child": { pb: 2 } }}><Box aria-hidden="true" sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: "50%", fontWeight: 900 }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{value}</Typography></Box></CardContent></Card>;
}
