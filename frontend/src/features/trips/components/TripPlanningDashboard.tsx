"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { authCleared } from "@/features/auth/authSlice";
import { ApiClientError, setCsrfToken } from "@/lib/api/client";
import { listVehicles, safeVehicleError } from "@/features/vehicles/vehiclesApi";
import { vehiclesFailed, vehiclesLoaded, vehiclesLoading } from "@/features/vehicles/vehiclesSlice";
import { previewTrip, safeTripError } from "../tripsApi";
import {
  destinationSelected,
  originSelected,
  tripPreviewFailed,
  tripPreviewLoaded,
  tripPreviewLoading,
} from "../tripsSlice";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { VehicleRangeControl } from "./VehicleRangeControl";
import { RouteSummary } from "./RouteSummary";
import { FavoriteRoutes } from "./FavoriteRoutes";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <Box sx={{ height: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>,
});

export function TripPlanningDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const trip = useSelector((state: RootState) => state.trips);
  const vehicles = useSelector((state: RootState) => state.vehicles);
  const [vehicleLoadMessage, setVehicleLoadMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const selectedVehicle = useMemo(() => vehicles.items.find((item) => item.id === trip.vehicleId), [vehicles.items, trip.vehicleId]);

  useEffect(() => {
    if (trip.origin) setOriginText(trip.origin.label);
    if (trip.destination) setDestinationText(trip.destination.label);
  }, [trip.origin, trip.destination]);

  const loadVehicles = useCallback(async () => {
    dispatch(vehiclesLoading());
    setVehicleLoadMessage("");
    try {
      const result = await listVehicles();
      dispatch(vehiclesLoaded(result.vehicles));
      setCheckingAccess(false);
    } catch (cause) {
      const message = safeVehicleError(cause);
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(vehiclesFailed(message));
      setVehicleLoadMessage(message);
      setCheckingAccess(false);
    }
  }, [dispatch, router]);

  useEffect(() => { void loadVehicles(); }, [loadVehicles]);

  async function preview() {
    if (!trip.origin || !trip.destination || !trip.vehicleId || trip.currentLevelPercent === null) return;
    dispatch(tripPreviewLoading());
    try {
      if (trip.origin.latitude === trip.destination.latitude && trip.origin.longitude === trip.destination.longitude) {
        dispatch(tripPreviewFailed("Choose two different locations."));
        return;
      }
      const result = await previewTrip({
        origin: trip.origin,
        destination: trip.destination,
        vehicle_id: trip.vehicleId,
        current_level_percent: trip.currentLevelPercent,
      });
      dispatch(tripPreviewLoaded(result));
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(tripPreviewFailed(safeTripError(cause)));
    }
  }
  return (
    checkingAccess ? (
      <Box component="main" role="status" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#081523", color: "white", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label="Se verifică sesiunea" />
      </Box>
    ) :
    <Box component="main" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#081523", color: "white", px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ maxWidth: 1240, mx: "auto" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ color: "#58dced", letterSpacing: 2 }}>PLANIFICARE CĂLĂTORIE</Typography>
          <Typography variant="h3" sx={{ fontWeight: 850, fontSize: { xs: "2.1rem", sm: "3.2rem" } }}>Plan a trip<span style={{ color: "#58dced" }}>.</span></Typography>
          <Typography color="grey.400" sx={{ mt: 0.5 }}>Alege destinația și verifică traseul în funcție de autonomia mașinii tale.</Typography>
        </Box>

        {vehicleLoadMessage && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void loadVehicles()}>Reîncearcă</Button>} sx={{ mb: 2 }}>{vehicleLoadMessage}</Alert>}
        {!vehicleLoadMessage && vehicles.status === "loading" && vehicles.items.length === 0 && <Typography role="status">Se încarcă vehiculele…</Typography>}
        {vehicles.status !== "loading" && (
          <>
            {vehicles.items.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" href="/vehicles">My vehicles</Button>}>
                Adaugă un vehicul în My vehicles pentru a putea previzualiza un traseu. Poți salva locațiile favorite și acum.
              </Alert>
            )}
            <Card sx={{ bgcolor: "#102235", color: "white", border: "1px solid #34495d", borderRadius: 4, mb: 2.5 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <PlaceAutocomplete label="Punct de plecare" value={originText} selected={trip.origin} onChange={setOriginText} onSelect={(place) => dispatch(originSelected(place))} allowCurrentLocation />
                  <PlaceAutocomplete label="Destinație" value={destinationText} selected={trip.destination} onChange={setDestinationText} onSelect={(place) => dispatch(destinationSelected(place))} />
                </Box>
                <FavoriteRoutes canSave={trip.origin?.label === originText && trip.destination?.label === destinationText} />
                {vehicles.items.length > 0 && (
                  <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, gap: 2, alignItems: "end" }}>
                    <VehicleRangeControl />
                    <Button variant="contained" size="large" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || selectedVehicle.range_km <= 0 || trip.currentLevelPercent === null || trip.status === "loading"} sx={{ minHeight: 56, px: 4, fontWeight: 800 }}>
                      {trip.status === "loading" ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}Previzualizează traseul
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
            {trip.error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || trip.currentLevelPercent === null}>Reîncearcă</Button>} sx={{ mb: 2 }}>{trip.error}</Alert>}
            {trip.preview && trip.origin && trip.destination && (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.3fr) minmax(320px, .7fr)" }, gap: 2 }}>
                <RouteMap preview={trip.preview} origin={trip.origin} destination={trip.destination} />
                <Card sx={{ bgcolor: "#102235", color: "white", border: "1px solid #34495d", borderRadius: 4 }}>
                  <CardContent><Stack spacing={2}><Typography variant="h5" sx={{ fontWeight: 800 }}>Detalii traseu</Typography><RouteSummary preview={trip.preview} /></Stack></CardContent>
                </Card>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
