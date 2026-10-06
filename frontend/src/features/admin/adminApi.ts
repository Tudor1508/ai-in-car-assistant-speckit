import { apiRequest } from "@/lib/api/client";

export type Page<T> = { [key: string]: T[] | unknown; stats: Record<string, unknown>; pagination: { page: number; page_size: number; total: number; total_pages: number } };
export type Query = { page: number; page_size: number; sort_by: string; sort_order: "asc" | "desc"; [key: string]: string | number };
export function listAdmin<T>(section: "users" | "vehicles" | "producers", query: Query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "") params.set(key, String(value)); });
  return apiRequest<Page<T>>(`/admin/${section}?${params.toString()}`);
}
export function deactivateAdminUser(id: string) {
  return apiRequest<{ status: "disabled" }>(`/admin/users/${encodeURIComponent(id)}`, "DELETE", { confirmation: "DELETE" });
}
export function createAdminProducer(payload: { name: string; brand: string; email: string; password: string }) {
  return apiRequest<{ producer: Record<string, unknown> }>("/admin/producers", "POST", payload);
}
