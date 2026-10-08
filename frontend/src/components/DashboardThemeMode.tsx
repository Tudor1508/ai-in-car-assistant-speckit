"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { createTheme } from "@mui/material/styles";

export type DashboardMode = "light" | "dark";
export const dashboardThemeKey = "drivewise-admin-theme";

export function useDashboardThemeMode() {
  const [mode, setMode] = useState<DashboardMode>("light");
  useEffect(() => {
    const savedMode = window.localStorage.getItem(dashboardThemeKey);
    if (savedMode === "light" || savedMode === "dark") setMode(savedMode);
  }, []);
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === "light" ? "#087f91" : "#62d7e8" },
      background: mode === "light" ? { default: "#f4f7fb", paper: "#ffffff" } : { default: "#101820", paper: "#1b2733" },
    },
    shape: { borderRadius: 12 },
  }), [mode]);
  function toggleMode() {
    const nextMode = mode === "light" ? "dark" : "light";
    window.localStorage.setItem(dashboardThemeKey, nextMode);
    setMode(nextMode);
  }
  return { mode, theme, toggleMode };
}

export function DashboardThemeToggle({ mode, onToggle }: { mode: DashboardMode; onToggle: () => void }) {
  const label = mode === "light" ? "Switch to dark mode" : "Switch to light mode";
  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={onToggle} color="inherit">
        {mode === "light" ? "☾" : "☀"}
      </IconButton>
    </Tooltip>
  );
}
