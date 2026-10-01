"use client";

import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { Vehicle } from "../vehiclesSlice";

type Props = {
  vehicle: Vehicle | null;
  onClose: () => void;
  onConfirm: (vehicle: Vehicle) => Promise<void>;
};

export function VehicleDeleteDialog({ vehicle, onClose, onConfirm }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!vehicle) return;
    setPending(true);
    setError("");
    try {
      await onConfirm(vehicle);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nu am putut șterge vehiculul. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!vehicle} onClose={pending ? undefined : onClose} aria-labelledby="delete-vehicle-title" aria-describedby="delete-vehicle-description">
      <DialogTitle id="delete-vehicle-title">Ștergi vehiculul?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
        <span id="delete-vehicle-description">Vehiculul {vehicle?.name} {vehicle?.model} va fi eliminat din garaj.</span>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>Anulează</Button>
        <Button onClick={confirm} color="error" variant="contained" disabled={pending}>{pending ? "Se șterge…" : "Șterge"}</Button>
      </DialogActions>
    </Dialog>
  );
}
