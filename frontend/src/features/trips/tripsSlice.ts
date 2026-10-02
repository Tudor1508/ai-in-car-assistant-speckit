import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { authCleared } from "@/features/auth/authSlice";

export type PlaceSelection = {
  label: string;
  latitude: number;
  longitude: number;
  provider_id?: string;
};

export type FavoriteRoute = {
  id: string;
  origin: PlaceSelection;
  destination: PlaceSelection;
  created_at: string;
};

export type TripRoutePreview = {
  feasibility: { status: "complete" | "incomplete"; message: string | null };
  vehicle: {
    id: string;
    current_level_percent: number;
    available_range_km: number;
    maximum_range_km: number;
  };
  route: {
    geometry: { type: "LineString"; coordinates: [number, number][] };
    distance_m: number;
    duration_s: number;
  };
  legs: { sequence: number; distance_m: number; duration_s: number }[];
  stops: {
    sequence: number;
    provider_id: string | null;
    name: string | null;
    station_type: "charging" | "fuel";
    latitude: number;
    longitude: number;
    leg_distance_m: number;
    route_progress_m: number;
  }[];
};

type TripsState = {
  origin: PlaceSelection | null;
  destination: PlaceSelection | null;
  vehicleId: string | null;
  currentLevelPercent: number | null;
  preview: TripRoutePreview | null;
  favorites: FavoriteRoute[];
  favoritesStatus: "idle" | "loading" | "succeeded" | "failed";
  favoritesError: string | null;
  favoriteSaveStatus: "idle" | "loading" | "succeeded" | "failed";
  favoriteSaveError: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: TripsState = {
  origin: null,
  destination: null,
  vehicleId: null,
  currentLevelPercent: null,
  preview: null,
  favorites: [],
  favoritesStatus: "idle",
  favoritesError: null,
  favoriteSaveStatus: "idle",
  favoriteSaveError: null,
  status: "idle",
  error: null,
};

const tripsSlice = createSlice({
  name: "trips",
  initialState,
  reducers: {
    originSelected(state, action: PayloadAction<PlaceSelection | null>) {
      state.origin = action.payload;
      state.preview = null;
      state.status = "idle";
      state.error = null;
    },
    destinationSelected(state, action: PayloadAction<PlaceSelection | null>) {
      state.destination = action.payload;
      state.preview = null;
      state.status = "idle";
      state.error = null;
    },
    vehicleSelected(state, action: PayloadAction<string | null>) {
      state.vehicleId = action.payload;
      state.preview = null;
      state.status = "idle";
      state.error = null;
    },
    currentLevelChanged(state, action: PayloadAction<number | null>) {
      state.currentLevelPercent = action.payload;
      state.preview = null;
      state.status = "idle";
      state.error = null;
    },
    tripPreviewLoading(state) {
      state.status = "loading";
      state.error = null;
      state.preview = null;
    },
    tripPreviewLoaded(state, action: PayloadAction<TripRoutePreview>) {
      state.preview = action.payload;
      state.status = "succeeded";
      state.error = null;
    },
    tripPreviewFailed(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.error = action.payload;
    },
    favoritesLoaded(state, action: PayloadAction<FavoriteRoute[]>) {
      state.favorites = action.payload;
      state.favoritesStatus = "succeeded";
      state.favoritesError = null;
    },
    favoritesLoading(state) {
      state.favoritesStatus = "loading";
      state.favoritesError = null;
    },
    favoritesFailed(state, action: PayloadAction<string>) {
      state.favoritesStatus = "failed";
      state.favoritesError = action.payload;
    },
    favoriteSaving(state) {
      state.favoriteSaveStatus = "loading";
      state.favoriteSaveError = null;
    },
    favoriteSaveFailed(state, action: PayloadAction<string>) {
      state.favoriteSaveStatus = "failed";
      state.favoriteSaveError = action.payload;
    },
    favoriteSaved(state, action: PayloadAction<FavoriteRoute>) {
      const existingIndex = state.favorites.findIndex(
        (favorite) => favorite.id === action.payload.id,
      );
      if (existingIndex === -1) state.favorites.unshift(action.payload);
      else state.favorites[existingIndex] = action.payload;
      state.favoriteSaveStatus = "succeeded";
      state.favoriteSaveError = null;
    },
    favoriteSelected(state, action: PayloadAction<FavoriteRoute>) {
      state.origin = action.payload.origin;
      state.destination = action.payload.destination;
      state.preview = null;
    },
  },
  extraReducers(builder) {
    builder.addCase(authCleared, () => initialState);
  },
});

export const {
  originSelected,
  destinationSelected,
  vehicleSelected,
  currentLevelChanged,
  tripPreviewLoading,
  tripPreviewLoaded,
  tripPreviewFailed,
  favoritesLoaded,
  favoritesLoading,
  favoritesFailed,
  favoriteSaving,
  favoriteSaveFailed,
  favoriteSaved,
  favoriteSelected,
} = tripsSlice.actions;

export default tripsSlice.reducer;
