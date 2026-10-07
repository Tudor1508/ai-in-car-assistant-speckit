import { apiRequest, ApiClientError } from "@/lib/api/client";
import type { Vehicle } from "./vehiclesSlice";

export type VehicleInput = Omit<Vehicle, "id" | "created_at" | "updated_at">;
export type VehiclePatch = Partial<VehicleInput>;

export function safeVehicleError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "authentication_required") return "Your session has expired. Please sign in again.";
    if (error.code === "vehicle_not_found") return "This vehicle is no longer available. Reload your garage.";
    if (error.code === "validation_error") return "Check the vehicle details and try again.";
    return error.message || "The request could not be processed. Please try again.";
  }
  return "The request could not be processed. Check your connection and try again.";
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
