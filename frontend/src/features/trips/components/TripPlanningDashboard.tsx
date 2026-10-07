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
import { previewTrip, safeTripError, saveTripHistory } from "../tripsApi";
import {
  destinationSelected,
  originSelected,
  tripPreviewFailed,
  tripPreviewLoaded,
  tripPreviewLoading,
  routeOptionSelected,
  historySaving, historySaved, historySaveFailed,
} from "../tripsSlice";
import type { TripRouteChoice, TripRouteOption } from "../tripsSlice";
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
  const [selectedPreference, setSelectedPreference] = useState<TripRouteChoice["preference"]>("fastest");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const selectedVehicle = useMemo(() => vehicles.items.find((item) => item.id === trip.vehicleId), [vehicles.items, trip.vehicleId]);
  const selectedChoice = trip.preview?.route_choices?.find((choice) => choice.preference === selectedPreference && choice.status === "available");
  const selectedOption = trip.preview?.route_options?.find((option) => option.id === (selectedChoice?.route_option_id ?? trip.selectedRouteOptionId));
  const displayedPreview = selectedOption ? {
    ...trip.preview!,
    ...selectedOption,
    route_labels: [selectedPreference],
    attractions: selectedPreference === "scenic" ? selectedOption.attractions : [],
    restaurants: selectedPreference === "scenic" ? selectedOption.restaurants : [],
  } : trip.preview;
  const routeGroups = (trip.preview?.route_choices ?? []).reduce<Array<{ option: TripRouteOption; choices: [TripRouteChoice] }>>((groups, choice) => {
    if (choice.status !== "available" || !choice.route_option_id) return groups;
    const option = trip.preview?.route_options?.find((candidate) => candidate.id === choice.route_option_id);
    if (!option) return groups;
    groups.push({ option, choices: [choice] });
    return groups;
  }, []);
  const unavailableChoices = (trip.preview?.route_choices ?? []).filter((choice) => choice.status === "unavailable");

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
        route_preference: "all",
      });
      setSelectedPreference("fastest");
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
  async function saveSelectedTrip() {
    if (!displayedPreview || !trip.origin || !trip.destination || !trip.vehicleId || trip.currentLevelPercent === null) return;
    dispatch(historySaving()); setSaveMessage("");
    try {
      await saveTripHistory({ origin: trip.origin, destination: trip.destination, vehicle_id: trip.vehicleId,
        current_level_percent: trip.currentLevelPercent, route_preference: selectedPreference,
        route: displayedPreview.route, feasibility: displayedPreview.feasibility, legs: displayedPreview.legs,
        stops: displayedPreview.stops, attractions: displayedPreview.attractions ?? [], restaurants: displayedPreview.restaurants ?? [] });
      dispatch(historySaved()); setSaveMessage("Trip saved to Trip History.");
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === "authentication_required") { setCsrfToken(null); dispatch(authCleared()); router.replace("/login"); return; }
      const message = safeTripError(cause); dispatch(historySaveFailed(message)); setSaveMessage(message);
    }
  }
  return (
    checkingAccess ? (
      <Box component="main" role="status" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#081523", color: "white", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label="Checking your session" />
      </Box>
    ) :
    <Box component="main" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#081523", color: "white", px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ maxWidth: 1240, mx: "auto" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ color: "#58dced", letterSpacing: 2 }}>TRIP PLANNER</Typography>
          <Typography variant="h3" sx={{ fontWeight: 850, fontSize: { xs: "2.1rem", sm: "3.2rem" } }}>Plan a trip<span style={{ color: "#58dced" }}>.</span></Typography>
          <Typography color="grey.400" sx={{ mt: 0.5 }}>Choose a destination and check the route against your vehicle's range.</Typography>
        </Box>

        {vehicleLoadMessage && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void loadVehicles()}>Retry</Button>} sx={{ mb: 2 }}>{vehicleLoadMessage}</Alert>}
        {!vehicleLoadMessage && vehicles.status === "loading" && vehicles.items.length === 0 && <Typography role="status">Loading vehicles…</Typography>}
        {vehicles.status !== "loading" && (
          <>
            {vehicles.items.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" href="/vehicles">My vehicles</Button>}>
                Add a vehicle in My vehicles to preview a route. You can still save favorite locations now.
              </Alert>
            )}
            <Card sx={{ bgcolor: "#102235", color: "white", border: "1px solid #34495d", borderRadius: 4, mb: 2.5 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <PlaceAutocomplete label="Starting point" value={originText} selected={trip.origin} onChange={setOriginText} onSelect={(place) => dispatch(originSelected(place))} allowCurrentLocation />
                  <PlaceAutocomplete label="Destination" value={destinationText} selected={trip.destination} onChange={setDestinationText} onSelect={(place) => dispatch(destinationSelected(place))} />
                </Box>
                <FavoriteRoutes canSave={trip.origin?.label === originText && trip.destination?.label === destinationText} />
                {vehicles.items.length > 0 && (
                  <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, gap: 2, alignItems: "end" }}>
                    <VehicleRangeControl />
                    <Button variant="contained" size="large" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || selectedVehicle.range_km <= 0 || trip.currentLevelPercent === null || trip.status === "loading"} sx={{ minHeight: 56, px: 4, fontWeight: 800 }}>
                      {trip.status === "loading" ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}Generează rutele
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
            {trip.error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || trip.currentLevelPercent === null}>Reîncearcă</Button>} sx={{ mb: 2 }}>{trip.error}</Alert>}
            {trip.preview?.route_choices && (
              <Card sx={{ bgcolor: "#102235", color: "white", border: "1px solid #34495d", borderRadius: 4, mb: 2.5 }}>
                <CardContent>
                  <Typography id="generated-routes-label" variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>Rutele generate</Typography>
                  <Box role="group" aria-labelledby="generated-routes-label" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                    {routeGroups.map(({ option, choices }) => (
                      (() => {
                        const scenicChoice = choices.find((choice) => choice.preference === "scenic");
                        const routeIncomplete = option.feasibility.status === "incomplete";
                        const warningYellow = "#facc15";
                        const isSelected = selectedPreference === choices[0].preference && trip.selectedRouteOptionId === option.id;
                        return <Button key={`${choices[0].preference}:${option.id}`} variant={isSelected ? "contained" : "outlined"} aria-pressed={isSelected} onClick={() => { setSelectedPreference(choices[0].preference); dispatch(routeOptionSelected(option.id)); }} sx={{ minHeight: 104, display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", textTransform: "none", p: 1.75, borderColor: routeIncomplete ? warningYellow : "#58dced", ...(routeIncomplete && isSelected ? { bgcolor: warningYellow, color: "#17202a", "&:hover": { bgcolor: "#eab308" } } : {}), ...(routeIncomplete && !isSelected ? { color: warningYellow, "&:hover": { borderColor: warningYellow, bgcolor: "#332b0d" } } : {}) }}>
                        <Typography component="span" sx={{ fontWeight: 800 }}>{choices.map((choice) => routeName(choice.preference)).join(" · ")}</Typography>
                        <Typography component="span" variant="body2">{(option.route.distance_m / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km · {Math.round(option.route.duration_s / 60)} min</Typography>
                        {scenicChoice && (
                          <>
                            {scenicChoice.reason && scenicChoice.reason !== "no_attractions_found"
                              ? <Typography component="span" variant="caption" color="warning.light">{scenicCoverageMessage(scenicChoice.reason)}</Typography>
                              : <Typography component="span" variant="caption">{option.attraction_count} atracții găsite</Typography>}
                          </>
                        )}
                        <Typography component="span" variant="caption" sx={routeIncomplete ? { fontWeight: 800 } : undefined}>{routeIncomplete ? `Ruta indisponibilă cu autonomia actuală${option.feasibility.additional_range_km != null ? ` · mai ai nevoie de ${option.feasibility.additional_range_km.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km` : ""}` : "Autonomie suficientă"}</Typography>
                      </Button>;
                      })()
                    ))}
                    {unavailableChoices.map((choice) => (
                      <Alert key={choice.preference} severity="info" role="status" sx={{ bgcolor: "#142a3d", color: "white", alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 800 }}>{routeName(choice.preference)}</Typography>
                        {choice.reason === "no_attractions_found"
                          ? "Nu au fost găsite atracții pe rutele disponibile."
                          : "Nu s-a putut calcula o variantă Scenic pentru această călătorie."}
                      </Alert>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
            {displayedPreview && trip.origin && trip.destination && (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.3fr) minmax(320px, .7fr)" }, gap: 2 }}>
                <RouteMap preview={displayedPreview} origin={trip.origin} destination={trip.destination} />
                <Card sx={{ bgcolor: "#102235", color: "white", border: "1px solid #34495d", borderRadius: 4 }}>
                  <CardContent><Stack spacing={2}><Typography variant="h5" sx={{ fontWeight: 800 }}>Detalii traseu</Typography><RouteSummary preview={displayedPreview} />
                    <Button variant="contained" onClick={() => void saveSelectedTrip()} disabled={trip.historySaveStatus === "loading"}>
                      {trip.historySaveStatus === "loading" ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}Save trip
                    </Button>
                    {saveMessage && <Typography role={trip.historySaveStatus === "failed" ? "alert" : "status"}>{saveMessage}</Typography>}
                  </Stack></CardContent>
                </Card>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

function routeName(preference: TripRouteChoice["preference"]) {
  return preference === "fastest" ? "Fastest" : preference === "shortest" ? "Shortest" : "Scenic";
}

function scenicCoverageMessage(reason: NonNullable<TripRouteChoice["reason"]>) {
  if (reason === "no_distinct_candidates") return "ORS nu a furnizat o rută alternativă distinctă; Scenic folosește ruta disponibilă.";
  if (reason === "poi_geometry_limit") return "Limita serviciului a împiedicat verificarea atracțiilor.";
  if (reason === "poi_results_incomplete") return "Lista atracțiilor poate fi incompletă.";
  return "Serviciul de atracții nu a răspuns; ruta Scenic este disponibilă fără această verificare.";
}
