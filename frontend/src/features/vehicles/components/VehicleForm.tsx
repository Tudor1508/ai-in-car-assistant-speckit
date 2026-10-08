"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  createFilterOptions,
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

const popularVehicleBrands = [
  "Abarth", "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "BYD",
  "Cadillac", "Chevrolet", "Citroën", "Cupra", "Dacia", "Dodge", "DS Automobiles",
  "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep",
  "Kia", "Lamborghini", "Land Rover", "Lexus", "Maserati", "Mazda", "Mercedes-Benz",
  "MINI", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Polestar", "Porsche", "Renault",
  "SEAT", "Škoda", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

const vehicleModelsByBrand: Record<string, string[]> = {
  Abarth: ["500e", "595", "695"],
  Acura: ["Integra", "MDX", "RDX", "TLX"],
  "Alfa Romeo": ["Giulia", "Giulietta", "Junior", "Stelvio", "Tonale"],
  "Aston Martin": ["DB12", "DBX", "Vantage", "Vanquish"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "e-tron GT"],
  Bentley: ["Bentayga", "Continental GT", "Flying Spur"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "i4", "i5", "i7", "iX", "X1", "X3", "X5", "X6", "X7", "Z4"],
  BYD: ["Atto 3", "Dolphin", "Han", "Seal", "Sealion 7", "Tang"],
  Cadillac: ["CT4", "CT5", "Escalade", "Lyriq", "XT4", "XT5", "XT6"],
  Chevrolet: ["Camaro", "Corvette", "Cruze", "Equinox", "Malibu", "Silverado", "Spark", "Trax"],
  "Citroën": ["Ami", "Berlingo", "C3", "C3 Aircross", "C4", "C4 X", "C5 Aircross"],
  Cupra: ["Born", "Formentor", "Leon", "Tavascan", "Terramar"],
  Dacia: ["Bigster", "Duster", "Jogger", "Logan", "Sandero", "Spring"],
  Dodge: ["Challenger", "Charger", "Durango", "Hornet"],
  "DS Automobiles": ["DS 3", "DS 4", "DS 7", "DS 9"],
  Fiat: ["500", "500e", "600", "Panda", "Tipo"],
  Ford: ["Bronco", "Fiesta", "Focus", "Kuga", "Mustang", "Puma", "Ranger", "Tourneo", "Transit"],
  Genesis: ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  GMC: ["Acadia", "Hummer EV", "Sierra", "Terrain", "Yukon"],
  Honda: ["Accord", "Civic", "CR-V", "e:Ny1", "HR-V", "Jazz", "ZR-V"],
  Hyundai: ["Bayon", "i10", "i20", "i30", "Ioniq 5", "Ioniq 6", "Kona", "Santa Fe", "Tucson"],
  Infiniti: ["Q50", "QX50", "QX55", "QX60", "QX80"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
  Jeep: ["Avenger", "Compass", "Grand Cherokee", "Renegade", "Wrangler"],
  Kia: ["Ceed", "EV3", "EV6", "EV9", "Niro", "Picanto", "Sportage", "Sorento", "Stonic", "XCeed"],
  Lamborghini: ["Aventador", "Gallardo", "Huracán", "Revuelto", "Urus"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus: ["ES", "GX", "IS", "LS", "NX", "RX", "RZ", "UX"],
  Maserati: ["Ghibli", "GranTurismo", "Grecale", "Levante", "MC20", "Quattroporte"],
  Mazda: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "CX-80", "MX-5"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLE", "EQA", "EQB", "EQE", "EQS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class"],
  MINI: ["Aceman", "Clubman", "Cooper", "Countryman"],
  Mitsubishi: ["ASX", "Colt", "Eclipse Cross", "L200", "Outlander"],
  Nissan: ["Ariya", "Juke", "Leaf", "Micra", "Navara", "Qashqai", "X-Trail"],
  Opel: ["Astra", "Corsa", "Frontera", "Grandland", "Mokka"],
  Peugeot: ["208", "2008", "308", "3008", "408", "5008", "508", "Partner"],
  Polestar: ["2", "3", "4"],
  Porsche: ["718", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Renault: ["Arkana", "Austral", "Captur", "Clio", "Espace", "Megane", "Rafale", "Scenic", "Twingo"],
  SEAT: ["Arona", "Ateca", "Ibiza", "Leon", "Tarraco"],
  "Škoda": ["Enyaq", "Fabia", "Kamiq", "Karoq", "Kodiaq", "Octavia", "Scala", "Superb"],
  Subaru: ["BRZ", "Crosstrek", "Forester", "Impreza", "Outback", "Solterra"],
  Suzuki: ["Across", "Ignis", "Jimny", "S-Cross", "Swift", "Vitara"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck", "Roadster"],
  Toyota: ["Aygo X", "bZ4X", "Camry", "C-HR", "Corolla", "Hilux", "Land Cruiser", "Prius", "RAV4", "Yaris"],
  Volkswagen: ["Golf", "ID.3", "ID.4", "ID.5", "ID.7", "Passat", "Polo", "T-Cross", "T-Roc", "Tiguan", "Touareg"],
  Volvo: ["EC40", "EX30", "EX40", "EX90", "S60", "V60", "V90", "XC40", "XC60", "XC90"],
};

const filterBrandOptions = createFilterOptions<string>({
  matchFrom: "start",
  stringify: (option) => option,
  trim: true,
});

const numberInputSx = {
  "& input[type=number]": {
    appearance: "textfield",
    MozAppearance: "textfield",
    "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
  },
};

type PreviewState = {
  queryKey: string;
  status: "idle" | "loading" | "matched" | "fallback" | "saved";
  image: VehicleImage | null;
};

function identityKey(brand: string, model: string, year: string | number): string {
  return [brand, model, String(year)].map((value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase()).join("|");
}

export function VehicleForm({ open, vehicle, onClose, onSubmit }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [values, setValues] = useState<VehicleFormValues>(() => valuesFromVehicle(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ queryKey: "", status: "idle", image: null });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [discardUploadedPhoto, setDiscardUploadedPhoto] = useState(false);
  const requestSequence = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchingBrand = popularVehicleBrands.find((brand) => brand.toLocaleLowerCase() === values.brand.trim().toLocaleLowerCase());
  const modelSuggestions = matchingBrand ? vehicleModelsByBrand[matchingBrand] ?? [] : [];

  useEffect(() => {
    setValues(valuesFromVehicle(vehicle));
    setErrors({});
    setServerError("");
    setPreview({ queryKey: "", status: "idle", image: null });
    setUploadFile(null);
    setDiscardUploadedPhoto(false);
  }, [vehicle, open]);

  const currentIdentityKey = identityKey(values.brand || vehicle?.name || "", values.model, values.year);
  const savedIdentityKey = vehicle ? identityKey(vehicle.brand || vehicle.name, vehicle.model, vehicle.year) : "";
  const identityUnchanged = !!vehicle && currentIdentityKey === savedIdentityKey;
  const previewIsCurrent = preview.queryKey === currentIdentityKey;
  const previewImage = previewIsCurrent ? preview.image : null;
  const previewStatus = previewIsCurrent ? preview.status : "idle";

  useEffect(() => {
    if (!open) {
      requestSequence.current += 1;
      return;
    }

    const brand = values.brand.trim() || vehicle?.brand || vehicle?.name || "";
    const model = values.model.trim();
    const parsedYear = /^\d{4}$/.test(values.year) ? Number(values.year) : NaN;
    const queryKey = identityKey(brand, model, values.year);
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

    if (!brand || !model || !Number.isInteger(parsedYear) || parsedYear < 1886 || parsedYear > new Date().getFullYear()) {
      requestSequence.current += 1;
      return;
    }

    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(() => {
      setPreview((current) => current.queryKey === queryKey
        ? { ...current, status: "loading" }
        : current);
      void previewVehicleImage(brand, model, parsedYear).then((result: PreviewResult) => {
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
  }, [open, values.brand, values.model, values.year, vehicle, savedIdentityKey, uploadFile, discardUploadedPhoto]);

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
    if (key === "brand" || key === "model" || key === "year") requestSequence.current += 1;
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
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} aria-labelledby="vehicle-form-title"
      slotProps={{ paper: { sx: { maxHeight: { xs: "100dvh", sm: "calc(100% - 64px)" }, m: { xs: 0, sm: 4 }, width: { xs: "100%", sm: "calc(100% - 64px)" } } } }}>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        <DialogTitle id="vehicle-form-title">{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: "hidden", px: { xs: 2, sm: 3 } }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}
            {previewStatus === "loading" && <Alert severity="info" role="status">Searching Wikimedia Commons for a representative image…</Alert>}
            {previewStatus === "fallback" && <Alert severity="info" role="status">No reliable image match is available. You can still save this vehicle.</Alert>}
            {vehicle?.image?.provider === "user_upload" && !discardUploadedPhoto && !uploadFile && <Alert severity="success">Your uploaded photo stays active until you discard it.</Alert>}
            <VehicleImageDisplay
              image={previewImage}
              vehicleLabel={`${values.brand} ${values.model} ${values.year}`.trim() || "vehicle"}
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
            <Autocomplete
              freeSolo
              autoHighlight
              options={popularVehicleBrands}
              filterOptions={filterBrandOptions}
              value={values.brand}
              inputValue={values.brand}
              onChange={(_, newValue) => change("brand", typeof newValue === "string" ? newValue : newValue ?? "")}
              onInputChange={(_, newInputValue, reason) => {
                if (reason === "input" || reason === "clear") change("brand", newInputValue);
              }}
              disabled={pending}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Brand"
                  error={!!errors.brand}
                  helperText={errors.brand ?? "Start typing to see popular brands, or enter any brand."}
                  required
                  autoFocus
                />
              )}
            />
            <Autocomplete
              freeSolo
              autoHighlight
              options={modelSuggestions}
              filterOptions={filterBrandOptions}
              value={values.model}
              inputValue={values.model}
              onChange={(_, newValue) => change("model", typeof newValue === "string" ? newValue : newValue ?? "")}
              onInputChange={(_, newInputValue, reason) => {
                if (reason === "input" || reason === "clear") change("model", newInputValue);
              }}
              disabled={pending}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Model"
                  error={!!errors.model}
                  helperText={errors.model ?? (modelSuggestions.length > 0 ? "Choose a suggested model or enter any model." : "Enter the vehicle model.")}
                  required
                />
              )}
            />
            <TextField select label="Type" value={values.type} onChange={(event) => {
              const type = event.target.value as VehicleFormValues["type"];
              setValues((current) => ({ ...current, type, fuel_type: type === "electric" ? "" : current.fuel_type || "petrol" }));
              setErrors((current) => ({ ...current, type: undefined, fuel_type: undefined }));
            }} disabled={pending}>
              <MenuItem value="combustion">Combustion</MenuItem>
              <MenuItem value="electric">Electric</MenuItem>
            </TextField>
            <TextField sx={numberInputSx} label="Year" type="number" value={values.year} onChange={(event) => change("year", event.target.value)} error={!!errors.year} helperText={errors.year} required disabled={pending} slotProps={{ htmlInput: { min: 1886, max: new Date().getFullYear(), step: 1 } }} />
            <TextField sx={numberInputSx} label="Range (km)" type="number" value={values.range_km} onChange={(event) => change("range_km", event.target.value)} error={!!errors.range_km} helperText={errors.range_km} required disabled={pending} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            <TextField sx={numberInputSx} label="Mileage (km)" type="number" value={values.mileage_km} onChange={(event) => change("mileage_km", event.target.value)} error={!!errors.mileage_km} helperText={errors.mileage_km} required disabled={pending} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
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
