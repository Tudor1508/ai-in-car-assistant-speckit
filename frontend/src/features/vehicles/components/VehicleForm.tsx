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
  petrol: "Benzină",
  diesel: "Diesel",
  lpg: "GPL",
  cng: "GNC",
  other: "Alt tip",
};

export function VehicleForm({ open, vehicle, onClose, onSubmit }: Props) {
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
      setServerError(error instanceof Error ? error.message : "Nu am putut salva vehiculul. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="vehicle-form-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="vehicle-form-title">{vehicle ? "Editează vehiculul" : "Adaugă vehicul"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}
            <TextField label="Nume vehicul" value={values.name} onChange={(event) => change("name", event.target.value)} error={!!errors.name} helperText={errors.name} required autoFocus />
            <TextField label="Model" value={values.model} onChange={(event) => change("model", event.target.value)} error={!!errors.model} helperText={errors.model} required />
            <TextField select label="Tip" value={values.type} onChange={(event) => {
              const type = event.target.value as VehicleFormValues["type"];
              setValues((current) => ({ ...current, type, fuel_type: type === "electric" ? "" : current.fuel_type || "petrol" }));
              setErrors((current) => ({ ...current, type: undefined, fuel_type: undefined }));
            }}>
              <MenuItem value="combustion">Combustie</MenuItem>
              <MenuItem value="electric">Electric</MenuItem>
            </TextField>
            <TextField label="An" type="number" value={values.year} onChange={(event) => change("year", event.target.value)} error={!!errors.year} helperText={errors.year} required slotProps={{ htmlInput: { min: 1886, max: new Date().getFullYear(), step: 1 } }} />
            <TextField label="Autonomie (km)" type="number" value={values.range_km} onChange={(event) => change("range_km", event.target.value)} error={!!errors.range_km} helperText={errors.range_km} required slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            <TextField label="Kilometraj (km)" type="number" value={values.mileage_km} onChange={(event) => change("mileage_km", event.target.value)} error={!!errors.mileage_km} helperText={errors.mileage_km} required slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            {values.type === "combustion" ? (
              <TextField select label="Combustibil" value={values.fuel_type} onChange={(event) => change("fuel_type", event.target.value as VehicleFormValues["fuel_type"])} error={!!errors.fuel_type} helperText={errors.fuel_type} required>
                {Object.entries(fuelLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
            ) : <TextField label="Combustibil" value="Nu se aplică" disabled />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={pending}>Anulează</Button>
          <Button type="submit" variant="contained" disabled={pending}>{pending ? "Se salvează…" : "Salvează"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
