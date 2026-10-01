"use client";

import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "#081523", color: "white" }}>
    <Paper elevation={10} sx={{ width: "min(100%, 480px)", p: { xs: 3, sm: 5 }, borderRadius: 3, bgcolor: "#102235", color: "white" }}>
      <Typography variant="h4" sx={{ fontWeight: 700, textAlign: "center", mb: 3 }}>{title}</Typography>{children}
    </Paper>
  </Box>;
}
