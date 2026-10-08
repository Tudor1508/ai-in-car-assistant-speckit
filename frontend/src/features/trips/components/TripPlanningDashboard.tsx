"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, CircularProgress, IconButton, Stack, SvgIcon, Typography } from "@mui/material";
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
  tripPreviewCanceled,
  routeOptionSelected,
  historySaving, historySaved, historySaveFailed,
} from "../tripsSlice";
import type { TripRouteChoice, TripRouteOption } from "../tripsSlice";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { VehicleRangeControl } from "./VehicleRangeControl";
import { RouteSummary } from "./RouteSummary";
import { FavoriteRoutes } from "./FavoriteRoutes";
import { TravelConcierge } from "@/features/concierge/components/TravelConcierge";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <Box sx={{ height: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>,
});
const RouteMapEmptyState = dynamic(() => import("./RouteMapEmptyState"), {
  ssr: false,
  loading: () => <Box sx={{ height: { xs: 320, md: 460 }, display: "grid", placeItems: "center" }}><CircularProgress /></Box>,
});

export function TripPlanningDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const trip = useSelector((state: RootState) => state.trips);
  const vehicles = useSelector((state: RootState) => state.vehicles);
  const [vehicleLoadMessage, setVehicleLoadMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [selectedPreference, setSelectedPreference] = useState<TripRouteChoice["preference"]>("fastest");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const previewRequestId = useRef(0);
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    function syncFullscreenState() {
      setMapFullscreen(document.fullscreenElement === mapFrameRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  async function preview() {
    if (!trip.origin || !trip.destination || !trip.vehicleId || trip.currentLevelPercent === null) return;
    const requestId = ++previewRequestId.current;
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
      if (requestId !== previewRequestId.current) return;
      setSelectedPreference("fastest");
      dispatch(tripPreviewLoaded(result));
    } catch (cause) {
      if (requestId !== previewRequestId.current) return;
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(tripPreviewFailed(safeTripError(cause)));
    }
  }
  function cancelPreview() {
    previewRequestId.current += 1;
    dispatch(tripPreviewCanceled());
  }
  async function toggleMapFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement === mapFrameRef.current) {
        await document.exitFullscreen();
      } else if (mapFrameRef.current?.requestFullscreen) {
        await mapFrameRef.current.requestFullscreen();
      } else {
        setFullscreenError("Fullscreen mode is not available in this browser.");
      }
    } catch {
      setFullscreenError("Fullscreen mode could not be opened.");
    }
  }
  function selectFullscreenRoute(preference: TripRouteChoice["preference"]) {
    const choice = trip.preview?.route_choices?.find((item) => item.preference === preference);
    if (choice?.status !== "available" || !choice.route_option_id) return;
    setSelectedPreference(preference);
    dispatch(routeOptionSelected(choice.route_option_id));
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
      <Box component="main" role="status" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "background.default", color: "text.primary", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label="Checking your session" />
      </Box>
    ) :
    <Box component="main" sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "background.default", color: "text.primary", px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <TravelConcierge />
      <Box sx={{ maxWidth: 1240, mx: "auto" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ color: "#58dced", letterSpacing: 2 }}>TRIP PLANNER</Typography>
          <Typography variant="h3" sx={{ fontWeight: 850, fontSize: { xs: "2.1rem", sm: "3.2rem" } }}>Plan a trip<span style={{ color: "#58dced" }}>.</span></Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Choose a destination and check the route against your vehicle's range.</Typography>
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
            <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: 4, mb: 2.5 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <PlaceAutocomplete label="Starting point" value={originText} selected={trip.origin} onChange={setOriginText} onSelect={(place) => dispatch(originSelected(place))} allowCurrentLocation disabled={trip.status === "loading"} />
                  <PlaceAutocomplete label="Destination" value={destinationText} selected={trip.destination} onChange={setDestinationText} onSelect={(place) => dispatch(destinationSelected(place))} disabled={trip.status === "loading"} />
                </Box>
                <FavoriteRoutes canSave={trip.origin?.label === originText && trip.destination?.label === destinationText} disabled={trip.status === "loading"} />
                {vehicles.items.length > 0 && (
                  <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}>
                    <VehicleRangeControl disabled={trip.status === "loading"} />
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      {trip.status === "loading" ? (
                        <Button variant="outlined" color="warning" size="large" onClick={cancelPreview} startIcon={<CircularProgress size={18} color="inherit" aria-label="Route generation in progress" />} aria-busy="true" sx={{ minHeight: 56, px: 4, fontWeight: 800, width: { xs: "100%", sm: "auto" } }}>Stop</Button>
                      ) : (
                        <Button variant="contained" size="large" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || selectedVehicle.range_km <= 0 || trip.currentLevelPercent === null} sx={{ minHeight: 56, px: 4, fontWeight: 800, width: { xs: "100%", sm: "auto" } }}>
                          Generate routes
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
            {trip.error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void preview()} disabled={!trip.origin || !trip.destination || !selectedVehicle || trip.currentLevelPercent === null}>Reîncearcă</Button>} sx={{ mb: 2 }}>{trip.error}</Alert>}
            {trip.preview?.route_choices && (
              <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: 4, mb: 2.5 }}>
                <CardContent>
                  <Typography id="generated-routes-label" variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>Generated routes</Typography>
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
                              : <Typography component="span" variant="caption">{option.attraction_count} attractions found</Typography>}
                          </>
                        )}
                        <Typography component="span" variant="caption" sx={routeIncomplete ? { fontWeight: 800 } : undefined}>{routeIncomplete ? `Route exceeds current range${option.feasibility.additional_range_km != null ? ` · ${option.feasibility.additional_range_km.toLocaleString("en-US", { maximumFractionDigits: 1 })} km more needed` : ""}` : "Range is sufficient"}</Typography>
                      </Button>;
                      })()
                    ))}
                    {unavailableChoices.map((choice) => (
                      <Alert key={choice.preference} severity="info" role="status" sx={{ bgcolor: "background.default", color: "text.primary", alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 800 }}>{routeName(choice.preference)}</Typography>
                        {choice.reason === "no_attractions_found"
                          ? "No attractions were found along the available routes."
                          : "A Scenic route could not be calculated for this trip."}
                      </Alert>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
            {displayedPreview && trip.origin && trip.destination && (
              <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2 }}>
                <Box
                  ref={mapFrameRef}
                  sx={{
                    position: "relative",
                    height: mapFullscreen ? "100vh" : undefined,
                    "&:fullscreen": { width: "100vw", height: "100vh", maxWidth: "none", borderRadius: 0, overflow: "hidden", bgcolor: "background.default" },
                  }}
                >
                  <RouteMap preview={displayedPreview} origin={trip.origin} destination={trip.destination} height={mapFullscreen ? "100%" : undefined} fullscreen={mapFullscreen} />
                  <IconButton
                    aria-label={mapFullscreen ? "Exit fullscreen map" : "Enter fullscreen map"}
                    title={mapFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    onClick={() => void toggleMapFullscreen()}
                    sx={{ position: "absolute", zIndex: 1300, top: 16, right: 16, width: 44, height: 44, bgcolor: "rgba(7,19,31,.84)", color: "white", border: "1px solid rgba(255,255,255,.24)", backdropFilter: "blur(10px)", "&:hover": { bgcolor: "rgba(7,19,31,.96)" } }}
                  >
                    <SvgIcon viewBox="0 0 24 24" fontSize="small">
                      {mapFullscreen
                        ? <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        : <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                    </SvgIcon>
                  </IconButton>
                  {mapFullscreen ? (
                    <Stack
                      component="header"
                      role="toolbar"
                      aria-label="Fullscreen map controls"
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ alignItems: "center", position: "absolute", zIndex: 1200, top: 16, left: "50%", transform: "translateX(-50%)", maxWidth: "calc(100% - 24px)", px: 1.25, py: 1, border: "1px solid rgba(255,255,255,.2)", borderRadius: 3, bgcolor: "rgba(7,19,31,.82)", color: "white", backdropFilter: "blur(14px)", boxShadow: "0 8px 28px rgba(0,0,0,.3)" }}
                    >
                      <Stack direction="row" role="group" aria-label="Select route type" spacing={0.5}>
                        {(["fastest", "shortest", "scenic"] as const).map((preference) => {
                          const choice = trip.preview?.route_choices?.find((item) => item.preference === preference);
                          const available = choice?.status === "available" && Boolean(choice.route_option_id);
                          return (
                            <Button
                              key={preference}
                              size="small"
                              variant={selectedPreference === preference ? "contained" : "outlined"}
                              aria-pressed={selectedPreference === preference}
                              disabled={!available}
                              onClick={() => selectFullscreenRoute(preference)}
                              sx={{ minWidth: { xs: 78, sm: 92 }, color: selectedPreference === preference ? "#071522" : "white", borderColor: "rgba(255,255,255,.4)", bgcolor: selectedPreference === preference ? "#58dced" : "transparent", "&:hover": { bgcolor: selectedPreference === preference ? "#8cecf6" : "rgba(255,255,255,.12)", borderColor: "white" } }}
                            >
                              {routeName(preference)}
                            </Button>
                          );
                        })}
                      </Stack>
                    </Stack>
                  ) : null}
                </Box>
                {fullscreenError && <Alert severity="warning" role="status">{fullscreenError}</Alert>}
                <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}><Typography variant="h5" sx={{ fontWeight: 800 }}>Route details</Typography><RouteSummary preview={displayedPreview} origin={trip.origin} destination={trip.destination} />
                    <Button variant="contained" onClick={() => void saveSelectedTrip()} disabled={trip.historySaveStatus === "loading"}>
                      {trip.historySaveStatus === "loading" ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}Save trip
                    </Button>
                    {saveMessage && <Typography role={trip.historySaveStatus === "failed" ? "alert" : "status"}>{saveMessage}</Typography>}
                  </Stack></CardContent>
                </Card>
              </Box>
            )}
            {!displayedPreview && <RouteMapEmptyState status={trip.status === "loading" ? "loading" : trip.status === "failed" ? "failed" : "idle"} />}
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
  if (reason === "no_distinct_candidates") return "ORS did not provide a distinct alternative route, so Scenic uses the available route.";
  if (reason === "poi_geometry_limit") return "A service limit prevented attraction checks.";
  if (reason === "poi_results_incomplete") return "The attraction list may be incomplete.";
  return "The attraction service did not respond; the Scenic route is available without this check.";
}
