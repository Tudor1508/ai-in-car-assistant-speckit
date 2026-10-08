import type { VehicleInput } from "./vehiclesApi";
import type { Vehicle } from "./vehiclesSlice";

export type VehicleFormValues = {
  name: string;
  model: string;
  brand: string;
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
    brand: vehicle?.brand ?? "",
    type: vehicle?.type ?? "combustion",
    year: vehicle ? String(vehicle.year) : "",
    range_km: vehicle ? String(vehicle.range_km) : "",
    mileage_km: vehicle ? String(vehicle.mileage_km) : "",
    fuel_type: vehicle?.fuel_type ?? (vehicle?.type === "electric" ? "" : "petrol"),
  };
}

function parseWholeKilometers(value: string, label: string, errors: VehicleFormErrors) {
  if (!/^\d+$/.test(value)) {
    errors[label as "range_km" | "mileage_km"] = "Enter a whole number of kilometers greater than or equal to zero.";
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
  const brand = values.brand.trim();
  if (!name || name.length > 80) errors.name = "Enter a name between 1 and 80 characters.";
  if (!model || model.length > 80) errors.model = "Enter a model between 1 and 80 characters.";
  if (!brand || brand.length > 120) errors.brand = "Enter a brand between 1 and 120 characters.";
  const year = /^\d{4}$/.test(values.year) ? Number(values.year) : NaN;
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear()) {
    errors.year = `Enter a year between 1886 and ${new Date().getFullYear()}.`;
  }
  const range_km = parseWholeKilometers(values.range_km, "range_km", errors);
  const mileage_km = parseWholeKilometers(values.mileage_km, "mileage_km", errors);
  if (values.type === "combustion" && !values.fuel_type) {
    errors.fuel_type = "Choose a fuel type.";
  }
  if (Object.keys(errors).length) return { errors, payload: null };
  return {
    errors,
    payload: {
      name,
      model,
      brand,
      type: values.type,
      year,
      range_km: range_km!,
      mileage_km: mileage_km!,
      fuel_type: values.type === "electric" ? null : values.fuel_type as NonNullable<VehicleInput["fuel_type"]>,
    },
  };
}
