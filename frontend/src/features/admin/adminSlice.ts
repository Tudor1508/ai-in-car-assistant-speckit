import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { authCleared } from "@/features/auth/authSlice";

export type AdminRow = Record<string, string | number | null>;
type Section = "users" | "vehicles" | "producers";
type SectionState = { items: AdminRow[]; stats: Record<string, unknown>; pagination: { page: number; page_size: number; total: number; total_pages: number }; status: "idle" | "loading" | "succeeded" | "failed"; error: string };
type AdminState = { sections: Record<Section, SectionState> };
const empty = (): SectionState => ({ items: [], stats: {}, pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 }, status: "idle", error: "" });
const initialState: AdminState = { sections: { users: empty(), vehicles: empty(), producers: empty() } };

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    adminRequestStarted(state, action: PayloadAction<Section>) { state.sections[action.payload].status = "loading"; state.sections[action.payload].error = ""; },
    adminRequestFailed(state, action: PayloadAction<{ section: Section; error: string }>) { const item = state.sections[action.payload.section]; item.status = "failed"; item.error = action.payload.error; },
    adminDataLoaded(state, action: PayloadAction<{ section: Section; items: AdminRow[]; stats: Record<string, unknown>; pagination: SectionState["pagination"] }>) { const item = state.sections[action.payload.section]; item.items = action.payload.items; item.stats = action.payload.stats; item.pagination = action.payload.pagination; item.status = "succeeded"; item.error = ""; },
    adminCleared() { return initialState; },
  },
  extraReducers: (builder) => builder.addCase(authCleared, () => initialState),
});

export const { adminRequestStarted, adminRequestFailed, adminDataLoaded, adminCleared } = adminSlice.actions;
export default adminSlice.reducer;
