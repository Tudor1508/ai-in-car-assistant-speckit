import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import vehiclesReducer from "@/features/vehicles/vehiclesSlice";

export const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer, vehicles: vehiclesReducer },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
