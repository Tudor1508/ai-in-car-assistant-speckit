import { apiRequest, ApiClientError } from "@/lib/api/client";
import type {
  FavoriteRoute,
  PlaceSelection,
  TripRoutePreview,
} from "./tripsSlice";

export type PlaceSearchResult = { places: PlaceSelection[] };
export type FavoriteListResult = { favorites: FavoriteRoute[] };
export type FavoriteSaveResult = { favorite: FavoriteRoute };

type TripPreviewPayload = {
  origin: PlaceSelection;
  destination: PlaceSelection;
  vehicle_id: string;
  current_level_percent: number;
};

export function safeTripError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "authentication_required") {
      return "Sesiunea ta a expirat. Autentifică-te din nou.";
    }
    if (error.code === "vehicle_not_found") {
      return "Vehiculul selectat nu mai este disponibil. Reîncarcă lista de vehicule.";
    }
    if (error.code === "route_not_found") {
      return "Nu am găsit un traseu rutier între aceste locații.";
    }
    if (error.code === "routing_provider_unavailable") {
      return "Serviciul de rutare nu este disponibil momentan. Încearcă din nou.";
    }
    if (error.code === "validation_error") {
      return "Verifică locațiile și nivelul de combustibil sau baterie.";
    }
    return error.message || "Cererea nu a putut fi procesată. Încearcă din nou.";
  }
  return "Cererea nu a putut fi procesată. Verifică conexiunea și încearcă din nou.";
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
