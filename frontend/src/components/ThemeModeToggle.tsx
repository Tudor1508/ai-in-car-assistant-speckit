"use client";

import { useEffect, useRef } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { themeModeChanged, type ThemeMode } from "@/features/theme/themeSlice";

const themeKey = "drivewise-theme";
const legacyAdminThemeKey = "drivewise-admin-theme";

export function ThemePreferenceSync() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const saved = window.localStorage.getItem(themeKey) ?? window.localStorage.getItem(legacyAdminThemeKey);
      if (saved === "light" || saved === "dark") {
        window.localStorage.setItem(themeKey, saved);
        if (saved !== mode) dispatch(themeModeChanged(saved));
      } else {
        window.localStorage.setItem(themeKey, mode);
      }
      return;
    }
    window.localStorage.setItem(themeKey, mode);
    window.localStorage.setItem(legacyAdminThemeKey, mode);
  }, [dispatch, mode]);

  return null;
}

export function ThemeModeToggle() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const dispatch = useDispatch<AppDispatch>();
  const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  function toggle() {
    window.localStorage.setItem(themeKey, nextMode);
    window.localStorage.setItem(legacyAdminThemeKey, nextMode);
    dispatch(themeModeChanged(nextMode));
  }

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={toggle} color="inherit" sx={{ "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 } }}>
        <span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span>
      </IconButton>
    </Tooltip>
  );
}
