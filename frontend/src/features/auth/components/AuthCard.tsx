"use client";

import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default", color: "text.primary" }}>
    <Paper elevation={10} sx={{ width: "min(100%, 480px)", p: { xs: 3, sm: 5 }, borderRadius: 3, bgcolor: "background.paper", color: "text.primary" }}>
      <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}><ThemeModeToggle /></Stack>
      <Typography variant="h4" sx={{ fontWeight: 700, textAlign: "center", mb: 3 }}>{title}</Typography>{children}
    </Paper>
  </Box>;
}
