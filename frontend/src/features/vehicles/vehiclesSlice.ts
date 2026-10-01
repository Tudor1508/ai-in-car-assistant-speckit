import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { authCleared } from "@/features/auth/authSlice";

export type VehicleType = "combustion" | "electric";
export type FuelType = "petrol" | "diesel" | "lpg" | "cng" | "other";

export type Vehicle = {
  id: string;
  name: string;
  model: string;
  type: VehicleType;
  year: number;
  range_km: number;
  mileage_km: number;
  fuel_type: FuelType | null;
  created_at: string;
  updated_at: string;
};

type VehiclesState = {
  items: Vehicle[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: VehiclesState = { items: [], status: "idle", error: null };

const vehiclesSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    vehiclesLoading(state) {
      state.status = "loading";
      state.error = null;
    },
    vehiclesLoaded(state, action: PayloadAction<Vehicle[]>) {
      state.items = action.payload;
      state.status = "succeeded";
      state.error = null;
    },
    vehicleSaved(state, action: PayloadAction<Vehicle>) {
      const index = state.items.findIndex((vehicle) => vehicle.id === action.payload.id);
      if (index < 0) state.items.push(action.payload);
      else state.items[index] = action.payload;
      state.status = "succeeded";
      state.error = null;
    },
    vehicleDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((vehicle) => vehicle.id !== action.payload);
      state.status = "succeeded";
      state.error = null;
    },
    vehiclesFailed(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.error = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(authCleared, () => initialState);
  },
});

export const {
  vehiclesLoading,
  vehiclesLoaded,
  vehicleSaved,
  vehicleDeleted,
  vehiclesFailed,
} = vehiclesSlice.actions;
export default vehiclesSlice.reducer;
