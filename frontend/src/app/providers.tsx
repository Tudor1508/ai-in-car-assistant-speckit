"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useRef, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";

const theme = createTheme({
  palette: { mode: "dark", primary: { main: "#31d8ef" }, background: { default: "#081523", paper: "#102235" } },
});

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = makeStore();
  }

  return (
    <ReduxProvider store={storeRef.current}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ReduxProvider>
  );
}
