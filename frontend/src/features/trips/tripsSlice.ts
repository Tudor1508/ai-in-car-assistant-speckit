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

export type RoutePreference = "fastest" | "shortest" | "scenic";
export type TripHistoryItem = {
  id: string; origin: PlaceSelection; destination: PlaceSelection; created_at: string;
  route_preference: RoutePreference;
  vehicle: TripRoutePreview["vehicle"] & { name: string; model: string; type: "combustion" | "electric" };
  route: TripRoutePreview["route"]; feasibility: RouteFeasibility; legs: TripRoutePreview["legs"];
  stops: RouteStop[]; attractions: TouristAttraction[]; restaurants: RouteRestaurant[];
};
export type TripHistorySummary = { total_trips: number; total_distance_m: number; total_duration_s: number };
export type TripHistoryPagination = { page: number; page_size: number; total: number; total_pages: number };
export type RouteLabel = RoutePreference;
export type TouristAttraction = { source_id: string | null; name: string | null; category: "attraction" | "viewpoint"; latitude: number; longitude: number; sequence: number; route_progress_m: number };
export type RouteRestaurant = { source_id: string | null; name: string | null; category: "restaurant"; latitude: number; longitude: number; sequence: number; route_progress_m: number };
export type RouteStop = { sequence: number; provider_id: string | null; name: string | null; station_type: "charging" | "fuel"; latitude: number; longitude: number; leg_distance_m: number; route_progress_m: number };
export type RouteFeasibility = { status: "complete" | "incomplete"; message: string | null; first_unreachable_stop?: RouteStop | null; next_station_distance_km?: number | null; additional_range_km?: number | null };
export type TripRouteChoice = { preference: RoutePreference; status: "available" | "unavailable"; route_option_id: string | null; reason: "no_attractions_found" | "no_distinct_candidates" | "poi_geometry_limit" | "poi_results_incomplete" | "provider_unavailable" | null };
export type TripRouteOption = { id: string; attraction_count: number; route_labels: RouteLabel[]; feasibility: TripRoutePreview["feasibility"]; vehicle: TripRoutePreview["vehicle"]; route: TripRoutePreview["route"]; legs: TripRoutePreview["legs"]; stops: TripRoutePreview["stops"]; attractions: TouristAttraction[]; restaurants?: RouteRestaurant[] };

export type TripRoutePreview = {
  feasibility: RouteFeasibility;
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
  stops: RouteStop[];
  route_preference?: RoutePreference | "all" | null;
  route_labels?: RouteLabel[];
  selected_route_option_id?: string | null;
  route_options?: TripRouteOption[] | null;
  route_choices?: TripRouteChoice[] | null;
  attractions?: TouristAttraction[] | null;
  restaurants?: RouteRestaurant[] | null;
};

type TripsState = {
  origin: PlaceSelection | null;
  destination: PlaceSelection | null;
  vehicleId: string | null;
  currentLevelPercent: number | null;
  selectedRouteOptionId: string | null;
  preview: TripRoutePreview | null;
  favorites: FavoriteRoute[];
  favoritesStatus: "idle" | "loading" | "succeeded" | "failed";
  favoritesError: string | null;
  favoriteSaveStatus: "idle" | "loading" | "succeeded" | "failed";
  favoriteSaveError: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  historyItems: TripHistoryItem[];
  historySummary: TripHistorySummary;
  historyPagination: TripHistoryPagination;
  historySort: "desc" | "asc";
  historyStatus: "idle" | "loading" | "succeeded" | "failed";
  historyError: string | null;
  historySaveStatus: "idle" | "loading" | "succeeded" | "failed";
  historySaveError: string | null;
};

const initialState: TripsState = {
  origin: null,
  destination: null,
  vehicleId: null,
  currentLevelPercent: null,
  selectedRouteOptionId: null,
  preview: null,
  favorites: [],
  favoritesStatus: "idle",
  favoritesError: null,
  favoriteSaveStatus: "idle",
  favoriteSaveError: null,
  status: "idle",
  error: null,
  historyItems: [], historySummary: { total_trips: 0, total_distance_m: 0, total_duration_s: 0 },
  historyPagination: { page: 1, page_size: 10, total: 0, total_pages: 0 }, historySort: "desc",
  historyStatus: "idle", historyError: null, historySaveStatus: "idle", historySaveError: null,
};

const tripsSlice = createSlice({
  name: "trips",
  initialState,
  reducers: {
    routeOptionSelected(state, action: PayloadAction<string>) { state.selectedRouteOptionId = action.payload; },
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
      state.selectedRouteOptionId = action.payload.selected_route_option_id ?? action.payload.route_options?.[0]?.id ?? null;
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
    historyLoading(state) { state.historyStatus = "loading"; state.historyError = null; },
    historyLoaded(state, action: PayloadAction<{ trips: TripHistoryItem[]; summary: TripHistorySummary; pagination: TripHistoryPagination }>) {
      state.historyItems = action.payload.trips; state.historySummary = action.payload.summary;
      state.historyPagination = action.payload.pagination; state.historyStatus = "succeeded"; state.historyError = null;
    },
    historyFailed(state, action: PayloadAction<string>) { state.historyStatus = "failed"; state.historyError = action.payload; },
    historySortChanged(state, action: PayloadAction<"desc" | "asc">) { state.historySort = action.payload; state.historyPagination.page = 1; state.historyStatus = "loading"; },
    historyPageChanged(state, action: PayloadAction<number>) { state.historyPagination.page = action.payload; state.historyStatus = "loading"; },
    historySaving(state) { state.historySaveStatus = "loading"; state.historySaveError = null; },
    historySaved(state) { state.historySaveStatus = "succeeded"; state.historySaveError = null; },
    historySaveFailed(state, action: PayloadAction<string>) { state.historySaveStatus = "failed"; state.historySaveError = action.payload; },
  },
  extraReducers(builder) {
    builder.addCase(authCleared, () => initialState);
  },
});

export const {
  originSelected,
  routeOptionSelected,
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
  historyLoading, historyLoaded, historyFailed, historySortChanged, historyPageChanged,
  historySaving, historySaved, historySaveFailed,
} = tripsSlice.actions;

export default tripsSlice.reducer;
