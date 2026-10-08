"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { previewVehicleImage, type VehicleImagePreview as PreviewResult } from "../vehiclesApi";
import type { Vehicle, VehicleImage } from "../vehiclesSlice";
import {
  validateVehicleForm,
  valuesFromVehicle,
  type VehicleFormErrors,
  type VehicleFormValues,
} from "../validation";
import { VehicleImageDisplay } from "./VehicleImageDisplay";

type Props = {
  open: boolean;
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (payload: VehicleInput, photo?: File) => Promise<void>;
};

const fuelLabels: Record<NonNullable<VehicleInput["fuel_type"]>, string> = {
  petrol: "Gasoline",
  diesel: "Diesel",
  lpg: "LPG",
  cng: "CNG",
  other: "Other",
};

type PreviewState = {
  queryKey: string;
  status: "idle" | "loading" | "matched" | "fallback" | "saved";
  image: VehicleImage | null;
};

function identityKey(name: string, model: string, year: string | number): string {
  return [name, model, String(year)].map((value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase()).join("|");
}

export function VehicleForm({ open, vehicle, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<VehicleFormValues>(() => valuesFromVehicle(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ queryKey: "", status: "idle", image: null });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [discardUploadedPhoto, setDiscardUploadedPhoto] = useState(false);
  const requestSequence = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValues(valuesFromVehicle(vehicle));
    setErrors({});
    setServerError("");
    setPreview({ queryKey: "", status: "idle", image: null });
    setUploadFile(null);
    setDiscardUploadedPhoto(false);
  }, [vehicle, open]);

  const currentIdentityKey = identityKey(values.name, values.model, values.year);
  const savedIdentityKey = vehicle ? identityKey(vehicle.name, vehicle.model, vehicle.year) : "";
  const identityUnchanged = !!vehicle && currentIdentityKey === savedIdentityKey;
  const previewIsCurrent = preview.queryKey === currentIdentityKey;
  const previewImage = previewIsCurrent ? preview.image : null;
  const previewStatus = previewIsCurrent ? preview.status : "idle";

  useEffect(() => {
    if (!open) {
      requestSequence.current += 1;
      return;
    }

    const name = values.name.trim();
    const model = values.model.trim();
    const parsedYear = /^\d{4}$/.test(values.year) ? Number(values.year) : NaN;
    const queryKey = identityKey(name, model, values.year);
    const sameAsSaved = !!vehicle && queryKey === savedIdentityKey;
    const savedImage = sameAsSaved ? vehicle.image : null;
    const retainedUpload = vehicle?.image?.provider === "user_upload" && !discardUploadedPhoto;
    if (uploadFile || retainedUpload) {
      requestSequence.current += 1;
      setPreview({ queryKey, status: "saved", image: vehicle?.image ?? null });
      return;
    }
    setPreview({
      queryKey,
      status: sameAsSaved && savedImage ? "saved" : "idle",
      image: savedImage,
    });

    if (!name || !model || !Number.isInteger(parsedYear) || parsedYear < 1886 || parsedYear > new Date().getFullYear()) {
      requestSequence.current += 1;
      return;
    }

    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(() => {
      setPreview((current) => current.queryKey === queryKey
        ? { ...current, status: "loading" }
        : current);
      void previewVehicleImage(name, model, parsedYear).then((result: PreviewResult) => {
        if (requestSequence.current !== sequence) return;
        setPreview({
          queryKey,
          status: result.status === "matched" ? "matched" : (sameAsSaved && savedImage ? "saved" : "fallback"),
          image: result.status === "matched" ? result.image : savedImage,
        });
      }).catch(() => {
        if (requestSequence.current !== sequence) return;
        setPreview({
          queryKey,
          status: sameAsSaved && savedImage ? "saved" : "fallback",
          image: savedImage,
        });
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      if (requestSequence.current === sequence) requestSequence.current += 1;
    };
  }, [open, values.name, values.model, values.year, vehicle, savedIdentityKey, uploadFile, discardUploadedPhoto]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setServerError("Choose a JPEG, PNG, or WebP photo up to 5 MB.");
      return;
    }
    requestSequence.current += 1;
    setServerError("");
    setUploadFile(file);
  }

  function change<K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) {
    if (key === "name" || key === "model" || key === "year") requestSequence.current += 1;
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateVehicleForm(values);
    setErrors(result.errors);
    setServerError("");
    if (!result.payload) return;
    const payload: VehicleInput = { ...result.payload };
    const currentPreview = previewIsCurrent ? preview : null;
    const currentFileTitle = currentPreview?.status === "matched" && currentPreview.image?.provider === "wikimedia_commons"
      ? currentPreview.image.file_title
      : null;
    const retainedUpload = vehicle?.image?.provider === "user_upload" && !discardUploadedPhoto;
    if (uploadFile) {
      payload.image_file_title = null;
    } else if (retainedUpload) {
      // The saved photo is authoritative even if make/model/year changed.
    } else if (discardUploadedPhoto) {
      payload.discard_uploaded_image = true;
      payload.image_file_title = currentFileTitle;
    } else if (!vehicle || !identityUnchanged) {
      payload.image_file_title = currentFileTitle;
    } else if (currentPreview?.status === "matched" && currentPreview.image) {
      payload.image_file_title = currentPreview.image.provider === "wikimedia_commons" ? currentPreview.image.file_title : null;
    }
    setPending(true);
    try {
      await onSubmit(payload, uploadFile ?? undefined);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The vehicle could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="vehicle-form-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="vehicle-form-title">{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}
            {previewStatus === "loading" && <Alert severity="info" role="status">Searching Wikimedia Commons for a representative image…</Alert>}
            {previewStatus === "fallback" && <Alert severity="info" role="status">No reliable image match is available. You can still save this vehicle.</Alert>}
            {vehicle?.image?.provider === "user_upload" && !discardUploadedPhoto && !uploadFile && <Alert severity="success">Your uploaded photo stays active until you discard it.</Alert>}
            <VehicleImageDisplay
              image={previewImage}
              vehicleLabel={`${values.name} ${values.model} ${values.year}`.trim() || "vehicle"}
              vehicleId={vehicle?.id}
              previewFile={uploadFile}
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} aria-label="Upload a photo of your vehicle" />
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Not your car in the image? Upload a photo</Button>
              {uploadFile && <Button onClick={() => setUploadFile(null)}>Remove selected photo</Button>}
              {vehicle?.image?.provider === "user_upload" && !discardUploadedPhoto && <Button color="warning" onClick={() => { setUploadFile(null); setDiscardUploadedPhoto(true); }}>Discard uploaded photo</Button>}
              {discardUploadedPhoto && <Button onClick={() => setDiscardUploadedPhoto(false)}>Keep uploaded photo</Button>}
            </Stack>
            <TextField label="Vehicle name" value={values.name} onChange={(event) => change("name", event.target.value)} error={!!errors.name} helperText={errors.name} required autoFocus />
            <TextField label="Brand" value={values.brand} onChange={(event) => change("brand", event.target.value)} error={!!errors.brand} helperText={errors.brand ?? "Manufacturer brand, for example Tesla."} required />
            <TextField label="Model" value={values.model} onChange={(event) => change("model", event.target.value)} error={!!errors.model} helperText={errors.model} required />
            <TextField select label="Type" value={values.type} onChange={(event) => {
              const type = event.target.value as VehicleFormValues["type"];
              setValues((current) => ({ ...current, type, fuel_type: type === "electric" ? "" : current.fuel_type || "petrol" }));
              setErrors((current) => ({ ...current, type: undefined, fuel_type: undefined }));
            }}>
              <MenuItem value="combustion">Combustion</MenuItem>
              <MenuItem value="electric">Electric</MenuItem>
            </TextField>
            <TextField label="Year" type="number" value={values.year} onChange={(event) => change("year", event.target.value)} error={!!errors.year} helperText={errors.year} required slotProps={{ htmlInput: { min: 1886, max: new Date().getFullYear(), step: 1 } }} />
            <TextField label="Range (km)" type="number" value={values.range_km} onChange={(event) => change("range_km", event.target.value)} error={!!errors.range_km} helperText={errors.range_km} required slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            <TextField label="Mileage (km)" type="number" value={values.mileage_km} onChange={(event) => change("mileage_km", event.target.value)} error={!!errors.mileage_km} helperText={errors.mileage_km} required slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            {values.type === "combustion" ? (
              <TextField select label="Fuel type" value={values.fuel_type} onChange={(event) => change("fuel_type", event.target.value as VehicleFormValues["fuel_type"])} error={!!errors.fuel_type} helperText={errors.fuel_type} required>
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
