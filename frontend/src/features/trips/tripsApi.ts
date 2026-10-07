import { apiRequest, ApiClientError } from "@/lib/api/client";
import type {
  FavoriteRoute,
  PlaceSelection,
  TripRoutePreview,
  RoutePreference,
  TripHistoryItem,
  TripHistorySummary,
  TripHistoryPagination,
} from "./tripsSlice";

export type PlaceSearchResult = { places: PlaceSelection[] };
export type FavoriteListResult = { favorites: FavoriteRoute[] };
export type FavoriteSaveResult = { favorite: FavoriteRoute };
export type TripHistoryResult = { trips: TripHistoryItem[]; summary: TripHistorySummary; pagination: TripHistoryPagination };

export function listTripHistory(page = 1, pageSize = 10, sortOrder: "desc" | "asc" = "desc"): Promise<TripHistoryResult> {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort_order: sortOrder });
  return apiRequest<TripHistoryResult>(`/trips/history?${query.toString()}`);
}

export function saveTripHistory(payload: {
  origin: PlaceSelection; destination: PlaceSelection; vehicle_id: string; current_level_percent: number;
  route_preference: RoutePreference; route: TripRoutePreview["route"]; feasibility: TripRoutePreview["feasibility"];
  legs: TripRoutePreview["legs"]; stops: TripRoutePreview["stops"];
  attractions: NonNullable<TripRoutePreview["attractions"]>; restaurants: NonNullable<TripRoutePreview["restaurants"]>;
}): Promise<{ trip: TripHistoryItem }> {
  return apiRequest<{ trip: TripHistoryItem }>("/trips/history", "POST", payload);
}

type TripPreviewPayload = {
  origin: PlaceSelection;
  destination: PlaceSelection;
  vehicle_id: string;
  current_level_percent: number;
  route_preference?: RoutePreference | "all";
};

export function safeTripError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "authentication_required") {
      return "Your session has expired. Please sign in again.";
    }
    if (error.code === "vehicle_not_found") {
      return "The selected vehicle is no longer available. Reload your vehicle list.";
    }
    if (error.code === "route_not_found") {
      return "No drivable route was found between these locations.";
    }
    if (error.code === "routing_provider_unavailable") {
      return "The routing service is temporarily unavailable. Please try again.";
    }
    if (error.code === "route_preference_unavailable") return "Traseul scenic nu este disponibil pentru această călătorie. Alege Fastest sau Shortest.";
    if (error.code === "validation_error") {
      return "Check the locations and the fuel or battery level.";
    }
    return error.message || "The request could not be processed. Please try again.";
  }
  return "The request could not be processed. Check your connection and try again.";
}

export function searchPlaces(query: string): Promise<PlaceSearchResult> {
  return apiRequest<PlaceSearchResult>(`/trips/places?q=${encodeURIComponent(query)}`);
}

export function previewTrip(payload: TripPreviewPayload): Promise<TripRoutePreview> {
  return apiRequest<TripRoutePreview>("/trips/preview", "POST", payload);
}

export function listFavoriteRoutes(): Promise<FavoriteListResult> {
  return apiRequest<FavoriteListResult>("/trips/favorites");
}

export function saveFavoriteRoute(payload: {
  origin: PlaceSelection;
  destination: PlaceSelection;
}): Promise<FavoriteSaveResult> {
  return apiRequest<FavoriteSaveResult>("/trips/favorites", "POST", payload);
}
