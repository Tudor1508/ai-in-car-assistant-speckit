import type { VehicleInput } from "./vehiclesApi";
import type { Vehicle } from "./vehiclesSlice";

export type VehicleFormValues = {
  name: string;
  model: string;
  type: "combustion" | "electric";
  year: string;
  range_km: string;
  mileage_km: string;
  fuel_type: "petrol" | "diesel" | "lpg" | "cng" | "other" | "";
};

export type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>;

export function valuesFromVehicle(vehicle?: Vehicle): VehicleFormValues {
  return {
    name: vehicle?.name ?? "",
    model: vehicle?.model ?? "",
    type: vehicle?.type ?? "combustion",
    year: vehicle ? String(vehicle.year) : "",
    range_km: vehicle ? String(vehicle.range_km) : "",
    mileage_km: vehicle ? String(vehicle.mileage_km) : "",
    fuel_type: vehicle?.fuel_type ?? (vehicle?.type === "electric" ? "" : "petrol"),
  };
}

function parseWholeKilometers(value: string, label: string, errors: VehicleFormErrors) {
  if (!/^\d+$/.test(value)) {
    errors[label as "range_km" | "mileage_km"] = "Introdu un număr întreg pozitiv sau zero de kilometri.";
    return null;
  }
  return Number(value);
}

export function validateVehicleForm(values: VehicleFormValues): {
  errors: VehicleFormErrors;
  payload: VehicleInput | null;
} {
  const errors: VehicleFormErrors = {};
  const name = values.name.trim();
  const model = values.model.trim();
  if (!name || name.length > 80) errors.name = "Introdu un nume cu 1–80 de caractere.";
  if (!model || model.length > 80) errors.model = "Introdu un model cu 1–80 de caractere.";
  const year = /^\d{4}$/.test(values.year) ? Number(values.year) : NaN;
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear()) {
    errors.year = `Introdu un an între 1886 și ${new Date().getFullYear()}.`;
  }
  const range_km = parseWholeKilometers(values.range_km, "range_km", errors);
  const mileage_km = parseWholeKilometers(values.mileage_km, "mileage_km", errors);
  if (values.type === "combustion" && !values.fuel_type) {
    errors.fuel_type = "Alege tipul de combustibil.";
  }
  if (Object.keys(errors).length) return { errors, payload: null };
  return {
    errors,
    payload: {
      name,
      model,
      type: values.type,
      year,
      range_km: range_km!,
      mileage_km: mileage_km!,
      fuel_type: values.type === "electric" ? null : values.fuel_type as NonNullable<VehicleInput["fuel_type"]>,
    },
  };
}
