"use client";

import { useState } from "react";
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Popover, Select, Stack, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { currentLevelChanged, vehicleSelected } from "../tripsSlice";
import { formatVehicleLabel } from "@/features/vehicles/vehicleLabel";

export function VehicleRangeControl({ disabled = false }: { disabled?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((state: RootState) => state.vehicles.items);
  const selectedId = useSelector((state: RootState) => state.trips.vehicleId);
  const percent = useSelector((state: RootState) => state.trips.currentLevelPercent);
  const vehicle = vehicles.find((item) => item.id === selectedId);
  const availableRange = vehicle && percent !== null ? vehicle.range_km * percent / 100 : null;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const levelLabel = vehicle?.type === "electric" ? "Battery remaining" : "Fuel remaining";
  const popupId = anchor ? "vehicle-range-dashboard" : undefined;
  const needleAngle = percent === null ? -90 : -90 + 180 * percent / 100;

  return (
    <Stack spacing={1.5}>
      <FormControl fullWidth>
        <InputLabel id="trip-vehicle-label">Vehicle</InputLabel>
        <Select
          labelId="trip-vehicle-label"
          label="Vehicle"
          value={selectedId ?? ""}
          onChange={(event) => dispatch(vehicleSelected(event.target.value || null))}
          required
          disabled={disabled}
        >
          {vehicles.map((item) => (
            <MenuItem key={item.id} value={item.id} disabled={item.range_km <= 0}>
              {formatVehicleLabel(item.name, item.model)} ({item.range_km > 0 ? `${item.range_km} km` : "range unavailable"})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {vehicles.length > 0 && vehicles.every((item) => item.range_km <= 0) && (
        <Alert severity="warning">Update the maximum range in My vehicles before planning a trip.</Alert>
      )}
      {vehicle && <Button
        fullWidth
        variant="outlined"
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        aria-controls={popupId}
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={disabled}
        sx={{ justifyContent: "space-between", minHeight: 56, textTransform: "none" }}
      >
        <span>{levelLabel}</span>
        <strong>{percent ?? "—"}% · {availableRange === null ? "—" : `${availableRange.toLocaleString("en-US")} km`}</strong>
      </Button>}
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { id: popupId, role: "dialog", "aria-label": `${levelLabel} dashboard`, sx: { p: 2.5, width: { xs: "min(340px, calc(100vw - 32px))", sm: 360 }, bgcolor: "background.paper", color: "text.primary" } } }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 750 }}>{levelLabel}</Typography>
          <Box sx={{ mx: "auto", width: 220, height: 126, position: "relative" }}>
            <Box sx={{ position: "absolute", left: 10, top: 5, width: 200, height: 100, border: "6px solid", borderColor: "divider", borderBottom: 0, borderRadius: "110px 110px 0 0" }} />
            <Box data-testid="range-dashboard-needle" data-percent={percent ?? 0} sx={{ position: "absolute", left: "50%", bottom: 26, width: 4, height: 83, bgcolor: "primary.main", borderRadius: 4, transformOrigin: "50% 100%", transform: `translateX(-50%) rotate(${needleAngle}deg)`, transition: "transform 160ms ease-out" }} />
            <Box sx={{ position: "absolute", left: "50%", bottom: 19, width: 18, height: 18, borderRadius: "50%", bgcolor: "primary.main", border: "3px solid", borderColor: "background.paper", transform: "translateX(-50%)" }} />
            <Typography variant="caption" sx={{ position: "absolute", left: 8, bottom: 0 }}>0%</Typography>
            <Typography variant="caption" sx={{ position: "absolute", right: 8, bottom: 0 }}>100%</Typography>
          </Box>
          <Typography role="meter" aria-label={`${levelLabel} percentage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? 0} sx={{ textAlign: "center", fontWeight: 800 }}>
            {percent ?? 0}% · Estimated range {availableRange === null ? "—" : `${availableRange.toLocaleString("en-US")} km`} of {vehicle?.range_km.toLocaleString("en-US")} km
          </Typography>
          <TextField
            label={`${levelLabel} (%)`}
            type="number"
            value={percent ?? ""}
            onChange={(event) => {
              const value = event.target.value === "" ? null : Number(event.target.value);
              dispatch(currentLevelChanged(value === null ? null : Math.max(0, Math.min(100, Math.trunc(value)))));
            }}
            sx={{ "& input[type=number]": { appearance: "textfield", MozAppearance: "textfield", "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 } } }}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1, "aria-label": "Current level percentage" } }}
            fullWidth
          />
        </Stack>
      </Popover>
      {vehicle && !anchor && <Typography variant="body2" color="text.secondary" aria-live="polite">
        Estimated range: {availableRange === null ? "—" : `${availableRange.toLocaleString("en-US")} km`}
        {` of ${vehicle.range_km.toLocaleString("en-US")} km`}
      </Typography>}
    </Stack>
  );
}
