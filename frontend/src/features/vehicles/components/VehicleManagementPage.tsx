"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { authCleared } from "@/features/auth/authSlice";
import { ApiClientError, setCsrfToken } from "@/lib/api/client";
import { VehicleForm } from "./VehicleForm";
import { VehicleDeleteDialog } from "./VehicleDeleteDialog";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  safeVehicleError,
  updateVehicle,
} from "../vehiclesApi";
import {
  vehicleDeleted,
  vehicleSaved,
  vehiclesFailed,
  vehiclesLoaded,
  vehiclesLoading,
  type Vehicle,
} from "../vehiclesSlice";
import type { VehicleInput } from "../vehiclesApi";

const fuelNames: Record<string, string> = {
  petrol: "Gasoline",
  diesel: "Diesel",
  lpg: "LPG",
  cng: "CNG",
  other: "Other",
};

export function VehicleManagementPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { items, status, error } = useSelector((state: RootState) => state.vehicles);
  const [editing, setEditing] = useState<Vehicle | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const garageHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusGarageAfterDelete = useRef(false);

  useEffect(() => {
    if (deleting === null && focusGarageAfterDelete.current) {
      focusGarageAfterDelete.current = false;
      garageHeadingRef.current?.focus();
    }
  }, [deleting]);

  const refresh = useCallback(async () => {
    dispatch(vehiclesLoading());
    try {
      const result = await listVehicles();
      dispatch(vehiclesLoaded(result.vehicles));
    } catch (cause) {
      const message = safeVehicleError(cause);
      if (cause instanceof ApiClientError && cause.code === "authentication_required") {
        setCsrfToken(null);
        dispatch(authCleared());
        router.replace("/login");
        return;
      }
      dispatch(vehiclesFailed(message));
    }
  }, [dispatch, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save(payload: VehicleInput) {
    try {
      const result = editing
        ? await updateVehicle(editing.id, payload)
        : await createVehicle(payload);
      dispatch(vehicleSaved(result.vehicle));
      setFormOpen(false);
      setEditing(undefined);
    } catch (cause) {
      throw new Error(safeVehicleError(cause));
    }
  }

  async function remove(vehicle: Vehicle) {
    try {
      await deleteVehicle(vehicle.id);
      dispatch(vehicleDeleted(vehicle.id));
      focusGarageAfterDelete.current = true;
    } catch (cause) {
      throw new Error(safeVehicleError(cause));
    }
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setFormOpen(true);
  }

  return (
    <Box sx={{ minHeight: "calc(100vh - 72px)", bgcolor: "#081523", color: "white", px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ maxWidth: 1060, mx: "auto" }}>
        <Box sx={{ mb: 3, p: { xs: 3, sm: 4 }, borderRadius: 4, background: "linear-gradient(120deg, #1a3040, #111a2a 75%)", border: "1px solid #283c4b" }}>
      <Typography variant="overline" sx={{ color: "#51def0", letterSpacing: 2 }}>▣ YOUR GARAGE</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: "2rem", sm: "3rem" } }}>My vehicles<span style={{ color: "#51def0" }}>.</span></Typography>
          <Typography sx={{ mt: 1, maxWidth: 520 }}>Keep your vehicle details up to date in one place.</Typography>
        </Box>
        <Card sx={{ bgcolor: "#0d1928", color: "white", border: "1px solid #283444", borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2.5 }}>
              <Box>
                <Typography ref={garageHeadingRef} id="garage-heading" tabIndex={-1} variant="h5" sx={{ fontWeight: 750, "&:focus-visible": { outline: "2px solid #58dced", outlineOffset: 4 } }}>My garage</Typography>
                <Typography variant="body2" color="grey.400">{items.length} {items.length === 1 ? "vehicle" : "vehicles"} in your garage</Typography>
              </Box>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={() => void refresh()} disabled={status === "loading"} sx={{ borderRadius: 5 }}>
                  Reload garage
                </Button>
                <Button variant="contained" onClick={openCreate} sx={{ borderRadius: 5, fontWeight: 700 }}>＋ Add vehicle</Button>
              </Stack>
            </Stack>
            {status === "loading" && items.length === 0 && <Typography role="status">Loading your garage…</Typography>}
            {error && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => void refresh()}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>}
            {status !== "loading" && items.length === 0 && !error && (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="h6">Your garage is empty</Typography>
                <Typography color="grey.400" sx={{ mb: 2 }}>Add your first vehicle to keep its details handy.</Typography>
                <Button variant="outlined" onClick={openCreate}>Add vehicle</Button>
              </Box>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              {items.map((vehicle) => (
                <Card key={vehicle.id} variant="outlined" sx={{ color: "white", bgcolor: "#101e30", borderColor: "#2a3b50", borderRadius: 4, borderLeft: `3px solid ${vehicle.type === "electric" ? "#58deeb" : "#f3cf4b"}` }}>
                  <CardContent>
                    <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>{vehicle.name}</Typography>
                        <Typography color="grey.300">{vehicle.model}</Typography>
                      </Box>
                      <Stack direction="row" sx={{ gap: 0.5 }}>
                        <Button size="small" onClick={() => openEdit(vehicle)} aria-label={`Edit ${vehicle.name}`}>Edit</Button>
                        <Button size="small" color="error" onClick={() => setDeleting(vehicle)} aria-label={`Delete ${vehicle.name}`}>Delete</Button>
                      </Stack>
                    </Stack>
                    <Typography variant="overline" sx={{ display: "block", mt: 2, color: "#59dced", fontWeight: 700 }}>AT A GLANCE</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, mt: 0.5 }}>
                      <Detail label="Type" value={vehicle.type === "electric" ? "Electric" : "Combustion"} />
                      <Detail label="Year" value={String(vehicle.year)} />
                      <Detail label="Range" value={`${vehicle.range_km.toLocaleString("en-US")} km`} />
                      <Detail label="Mileage" value={`${vehicle.mileage_km.toLocaleString("en-US")} km`} />
                      <Detail label="Fuel type" value={vehicle.fuel_type ? fuelNames[vehicle.fuel_type] : "Not applicable"} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
      <VehicleForm open={formOpen} vehicle={editing} onClose={() => { setFormOpen(false); setEditing(undefined); }} onSubmit={save} />
      <VehicleDeleteDialog vehicle={deleting} onClose={() => setDeleting(null)} onConfirm={remove} />
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0, bgcolor: "#202d40", border: "1px solid #354457", borderRadius: 3, px: 1.25, py: 1 }}>
      <Typography variant="caption" color="grey.300" sx={{ display: "block" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  );
}
