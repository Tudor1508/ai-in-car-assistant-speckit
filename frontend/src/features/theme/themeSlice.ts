import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";
type ThemeState = { mode: ThemeMode };

const initialState: ThemeState = { mode: "dark" };

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    themeModeChanged(state, action: PayloadAction<ThemeMode>) { state.mode = action.payload; },
  },
});

export const { themeModeChanged } = themeSlice.actions;
export default themeSlice.reducer;
