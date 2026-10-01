import { apiRequest, ApiClientError } from "@/lib/api/client";
import type { Vehicle } from "./vehiclesSlice";

export type VehicleInput = Omit<Vehicle, "id" | "created_at" | "updated_at">;
export type VehiclePatch = Partial<VehicleInput>;

export function safeVehicleError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "authentication_required") return "Sesiunea ta a expirat. Autentifică-te din nou.";
    if (error.code === "vehicle_not_found") return "Acest vehicul nu mai este disponibil. Reîncarcă garajul.";
    if (error.code === "validation_error") return "Verifică detaliile vehiculului și încearcă din nou.";
    return error.message || "Cererea nu a putut fi procesată. Încearcă din nou.";
  }
  return "Cererea nu a putut fi procesată. Verifică conexiunea și încearcă din nou.";
}

export function listVehicles(): Promise<{ vehicles: Vehicle[] }> {
  return apiRequest<{ vehicles: Vehicle[] }>("/vehicles");
}

export function createVehicle(payload: VehicleInput): Promise<{ vehicle: Vehicle }> {
  return apiRequest<{ vehicle: Vehicle }>("/vehicles", "POST", payload);
}

export function updateVehicle(id: string, payload: VehiclePatch): Promise<{ vehicle: Vehicle }> {
  return apiRequest<{ vehicle: Vehicle }>(`/vehicles/${encodeURIComponent(id)}`, "PATCH", payload);
}

export function deleteVehicle(id: string): Promise<{ status: "deleted" }> {
  return apiRequest<{ status: "deleted" }>(`/vehicles/${encodeURIComponent(id)}`, "DELETE", {});
}
