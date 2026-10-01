import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Account } from "./authApi";

type AuthState = { account: Account | null };
const initialState: AuthState = { account: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    accountLoaded(state, action: PayloadAction<Account>) { state.account = action.payload; },
    authCleared(state) { state.account = null; },
  },
});

export const { accountLoaded, authCleared } = authSlice.actions;
export default authSlice.reducer;
