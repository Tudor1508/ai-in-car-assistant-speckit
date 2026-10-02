"use client";

import { Alert, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { currentLevelChanged, vehicleSelected } from "../tripsSlice";

export function VehicleRangeControl() {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((state: RootState) => state.vehicles.items);
  const selectedId = useSelector((state: RootState) => state.trips.vehicleId);
  const percent = useSelector((state: RootState) => state.trips.currentLevelPercent);
  const vehicle = vehicles.find((item) => item.id === selectedId);
  const availableRange = vehicle && percent !== null ? vehicle.range_km * percent / 100 : null;

  return (
    <Stack spacing={1.5}>
      <FormControl fullWidth>
        <InputLabel id="trip-vehicle-label">Vehicul</InputLabel>
        <Select
          labelId="trip-vehicle-label"
          label="Vehicul"
          value={selectedId ?? ""}
          onChange={(event) => dispatch(vehicleSelected(event.target.value || null))}
          required
        >
          {vehicles.map((item) => (
            <MenuItem key={item.id} value={item.id} disabled={item.range_km <= 0}>
              {item.name} · {item.model} ({item.range_km > 0 ? `${item.range_km} km` : "autonomie indisponibilă"})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {vehicles.length > 0 && vehicles.every((item) => item.range_km <= 0) && (
        <Alert severity="warning">Actualizează autonomia maximă în My vehicles înainte de a planifica o călătorie.</Alert>
      )}
      <TextField
        label={vehicle?.type === "electric" ? "Baterie rămasă (%)" : "Combustibil rămas (%)"}
        type="number"
        value={percent ?? ""}
        onChange={(event) => {
          const value = event.target.value === "" ? null : Number(event.target.value);
          dispatch(currentLevelChanged(value === null ? null : Math.max(0, Math.min(100, Math.trunc(value)))));
        }}
        slotProps={{ htmlInput: { min: 0, max: 100, step: 1, "aria-label": "Nivel curent procentual" } }}
        disabled={!vehicle}
        required
      />
      {vehicle && (
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          Autonomie estimată: {availableRange === null ? "—" : `${availableRange.toLocaleString("ro-RO")} km`}
          {` din ${vehicle.range_km.toLocaleString("ro-RO")} km`}
        </Typography>
      )}
    </Stack>
  );
}
