"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Card, CardContent, IconButton, SvgIcon, Typography } from "@mui/material";
import type { TripHistoryItem, TripRoutePreview } from "../tripsSlice";
import { formatVehicleLabel } from "@/features/vehicles/vehicleLabel";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <Box sx={{ height: 220, bgcolor: "background.default" }} role="status">Loading map...</Box>,
});

function distance(m: number) {
  return `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

function duration(s: number) {
  const minutes = Math.round(s / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

export function TripHistoryCard({ trip, index }: { trip: TripHistoryItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    function syncFullscreenState() {
      setMapFullscreen(Boolean(mapFrameRef.current) && document.fullscreenElement === mapFrameRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "250px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const coordinates = trip.route?.geometry?.coordinates;
  const validGeometry = trip.route?.geometry?.type === "LineString" && Array.isArray(coordinates) && coordinates.length >= 2 && coordinates.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
  const preview: TripRoutePreview = { route: trip.route, feasibility: trip.feasibility, vehicle: trip.vehicle, legs: trip.legs, stops: trip.stops, attractions: trip.attractions, restaurants: trip.restaurants, route_preference: trip.route_preference, route_labels: [trip.route_preference] };
  const label = `Route map from ${trip.origin.label} to ${trip.destination.label}`;
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(trip.created_at));
  const vehicle = formatVehicleLabel(trip.vehicle.name, trip.vehicle.model);

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

  return (
    <Card sx={{ bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", borderLeft: "3px solid", borderLeftColor: "primary.main", borderRadius: 4 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: "primary.main" }}>JOURNEY {index} · ID {trip.id.slice(0, 8)}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{trip.origin.label} → {trip.destination.label}</Typography>
          </Box>
          <Typography component="time" dateTime={trip.created_at} sx={{ alignSelf: "flex-start", bgcolor: "action.hover", borderRadius: 5, px: 1.5, py: .75, fontSize: ".85rem" }}>{date}</Typography>
        </Box>
        {trip.feasibility.status === "incomplete" && <Alert severity="warning" sx={{ mb: 2 }}>This saved route was incomplete when planned.</Alert>}
        <Typography variant="overline" sx={{ letterSpacing: 1.5 }}>Route details</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1, my: 1.5 }}>
          <HistoryMetric label="Distance" value={distance(trip.route.distance_m)} />
          <HistoryMetric label="Duration" value={duration(trip.route.duration_s)} />
          <HistoryMetric label="Vehicle" value={vehicle || trip.vehicle.type} />
          <HistoryMetric label="Route type" value={trip.route_preference[0].toUpperCase() + trip.route_preference.slice(1)} />
        </Box>
        <Box ref={ref} sx={{ mt: 2 }}>
          {!validGeometry ? <Alert severity="info" role="status" sx={{ minHeight: 180, alignItems: "center" }}>The saved route map is unavailable because its route geometry is missing or invalid. Trip details remain available.</Alert>
            : near ? (
              <Box
                ref={mapFrameRef}
                sx={{
                  position: "relative",
                  height: mapFullscreen ? "100vh" : 220,
                  "&:fullscreen": { width: "100vw", height: "100vh", maxWidth: "none", borderRadius: 0, overflow: "hidden", bgcolor: "background.default" },
                }}
              >
                <RouteMap preview={preview} origin={trip.origin} destination={trip.destination} height={mapFullscreen ? "100%" : 220} mapLabel={label} fullscreen={mapFullscreen} />
                <IconButton
                  aria-label={mapFullscreen ? "Exit fullscreen map" : "Enter fullscreen map"}
                  title={mapFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  onClick={() => void toggleMapFullscreen()}
                  sx={{ position: "absolute", zIndex: 1300, top: 12, right: 12, width: 42, height: 42, bgcolor: "rgba(7,19,31,.84)", color: "white", border: "1px solid rgba(255,255,255,.24)", backdropFilter: "blur(10px)", "&:hover": { bgcolor: "rgba(7,19,31,.96)" } }}
                >
                  <SvgIcon viewBox="0 0 24 24" fontSize="small">
                    {mapFullscreen
                      ? <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      : <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                  </SvgIcon>
                </IconButton>
              </Box>
            )
              : <Box aria-label={label} role="img" sx={{ height: 220, borderRadius: 3, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }} />}
        </Box>
        {fullscreenError && <Alert severity="warning" role="status" sx={{ mt: 1 }}>{fullscreenError}</Alert>}
      </CardContent>
    </Card>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <Box sx={{ p: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 5, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{value}</Typography></Box>;
}
