"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { useMemo, useRef, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { makeStore, type AppStore, type RootState } from "@/lib/store";
import { useSelector } from "react-redux";
import { ThemePreferenceSync } from "@/components/ThemeModeToggle";

function AppTheme({ children }: Readonly<{ children: ReactNode }>) {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#14b8a6" : "#087f72" },
      background: mode === "dark" ? { default: "#081523", paper: "#102235" } : { default: "#f4f7fb", paper: "#ffffff" },
      text: mode === "dark" ? { primary: "#f8fafc", secondary: "#c0cad5" } : { primary: "#182433", secondary: "#48596c" },
    },
    shape: { borderRadius: 12 },
  }), [mode]);
  return <ThemeProvider theme={theme}><CssBaseline /><ThemePreferenceSync />{children}</ThemeProvider>;
}

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = makeStore();
  }

  return (
    <ReduxProvider store={storeRef.current}><AppTheme>{children}</AppTheme></ReduxProvider>
  );
}
