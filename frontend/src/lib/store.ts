import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import vehiclesReducer from "@/features/vehicles/vehiclesSlice";
import tripsReducer from "@/features/trips/tripsSlice";
import adminReducer from "@/features/admin/adminSlice";
import themeReducer from "@/features/theme/themeSlice";

export const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer, vehicles: vehiclesReducer, trips: tripsReducer, admin: adminReducer, theme: themeReducer },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
