"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { VehicleInput } from "../vehiclesApi";
import type { Vehicle } from "../vehiclesSlice";
import {
  validateVehicleForm,
  valuesFromVehicle,
  type VehicleFormErrors,
  type VehicleFormValues,
} from "../validation";

type Props = {
  open: boolean;
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (payload: VehicleInput) => Promise<void>;
};

const fuelLabels: Record<NonNullable<VehicleInput["fuel_type"]>, string> = {
  petrol: "Gasoline",
  diesel: "Diesel",
  lpg: "LPG",
  cng: "CNG",
  other: "Other",
};

export function VehicleForm({ open, vehicle, onClose, onSubmit }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [values, setValues] = useState<VehicleFormValues>(() => valuesFromVehicle(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setValues(valuesFromVehicle(vehicle));
    setErrors({});
    setServerError("");
  }, [vehicle, open]);

  function change<K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateVehicleForm(values);
    setErrors(result.errors);
    setServerError("");
    if (!result.payload) return;
    setPending(true);
    try {
      await onSubmit(result.payload);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The vehicle could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} aria-labelledby="vehicle-form-title"
      slotProps={{ paper: { sx: { maxHeight: { xs: "100dvh", sm: "calc(100% - 64px)" }, m: { xs: 0, sm: 4 }, width: { xs: "100%", sm: "calc(100% - 64px)" } } } }}>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        <DialogTitle id="vehicle-form-title">{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: "hidden", px: { xs: 2, sm: 3 } }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}
            <TextField label="Vehicle name" value={values.name} onChange={(event) => change("name", event.target.value)} error={!!errors.name} helperText={errors.name} required autoFocus disabled={pending} />
            <TextField label="Model" value={values.model} onChange={(event) => change("model", event.target.value)} error={!!errors.model} helperText={errors.model} required disabled={pending} />
            <TextField select label="Type" value={values.type} onChange={(event) => {
              const type = event.target.value as VehicleFormValues["type"];
              setValues((current) => ({ ...current, type, fuel_type: type === "electric" ? "" : current.fuel_type || "petrol" }));
              setErrors((current) => ({ ...current, type: undefined, fuel_type: undefined }));
            }} disabled={pending}>
              <MenuItem value="combustion">Combustion</MenuItem>
              <MenuItem value="electric">Electric</MenuItem>
            </TextField>
            <TextField label="Year" type="number" value={values.year} onChange={(event) => change("year", event.target.value)} error={!!errors.year} helperText={errors.year} required disabled={pending} slotProps={{ htmlInput: { min: 1886, max: new Date().getFullYear(), step: 1 } }} />
            <TextField label="Range (km)" type="number" value={values.range_km} onChange={(event) => change("range_km", event.target.value)} error={!!errors.range_km} helperText={errors.range_km} required disabled={pending} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            <TextField label="Mileage (km)" type="number" value={values.mileage_km} onChange={(event) => change("mileage_km", event.target.value)} error={!!errors.mileage_km} helperText={errors.mileage_km} required disabled={pending} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            {values.type === "combustion" ? (
              <TextField select label="Fuel type" value={values.fuel_type} onChange={(event) => change("fuel_type", event.target.value as VehicleFormValues["fuel_type"])} error={!!errors.fuel_type} helperText={errors.fuel_type} required disabled={pending}>
                {Object.entries(fuelLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
            ) : <TextField label="Fuel type" value="Not applicable" disabled />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
