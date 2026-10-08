"use client";

import { useState } from "react";
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { AttributionControl, MapContainer, TileLayer } from "react-leaflet";

const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;

export default function RouteMapEmptyState({ status = "idle" }: { status?: "idle" | "loading" | "failed" }) {
  const [tileFailed, setTileFailed] = useState(!tileUrl || !attribution);
  const isLoading = status === "loading";
  const title = isLoading
    ? "Finding your routes…"
    : status === "failed"
      ? "Route generation failed"
      : "Set a route";
  const message = isLoading
    ? "Comparing route options and checking your vehicle’s range."
    : status === "failed"
      ? "Review the error above, then try generating the route again."
      : "The map preview will appear here after a route is generated. Enter a starting point and destination to begin.";

  return (
    <Box
      role="region"
      aria-label="Trip map"
      sx={{
        height: { xs: 320, md: 460 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        position: "relative",
        bgcolor: "#dbe5e7",
        "& .leaflet-tile-pane": { filter: "blur(3px)" },
        "& .leaflet-control-attribution": { filter: "none" },
      }}
    >
      {tileUrl && attribution && !tileFailed && (
        <MapContainer
          center={[45.9, 25]}
          zoom={6}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          touchZoom={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            url={tileUrl}
            attribution={attribution}
            keepBuffer={0}
            updateWhenIdle={false}
            updateWhenZooming={false}
            eventHandlers={{ tileerror: () => setTileFailed(true) }}
          />
          <AttributionControl position="bottomright" prefix={false} />
        </MapContainer>
      )}

      <Box
        aria-hidden="true"
        sx={{ position: "absolute", inset: 0, zIndex: 500, bgcolor: "rgba(9, 22, 35, 0.34)" }}
      />

      <Paper
        role="status"
        elevation={5}
        sx={{
          position: "absolute",
          zIndex: 600,
          inset: "50% auto auto 50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "calc(100% - 32px)", sm: "auto" },
          maxWidth: "calc(100% - 32px)",
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderRadius: 3,
          bgcolor: "background.paper",
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Stack spacing={1} sx={{ alignItems: "center" }}>
          {isLoading && <CircularProgress size={28} thickness={5} color="info" aria-label="Generating routes" />}
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Stack>
      </Paper>

      {tileFailed && (
        <Alert severity="warning" role="alert" sx={{ position: "absolute", inset: 0, zIndex: 700, borderRadius: 0, alignItems: "center" }}>
          The map tiles could not be loaded. Check the configured map provider.
        </Alert>
      )}
    </Box>
  );
}
