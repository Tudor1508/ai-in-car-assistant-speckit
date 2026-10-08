"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default", color: "text.primary" }}>
      <Button
        component={Link}
        href="/"
        startIcon={<Box component="span" aria-hidden="true">←</Box>}
        sx={{
          position: "fixed",
          top: { xs: 16, sm: 24 },
          left: { xs: 16, sm: 24 },
          zIndex: 1,
          color: "text.primary",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 999,
          px: 2,
          "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
        }}
      >
        Back to home
      </Button>
      <Paper elevation={10} sx={{ width: "min(100%, 480px)", p: { xs: 3, sm: 5 }, borderRadius: 3, bgcolor: "background.paper", color: "text.primary" }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}><ThemeModeToggle /></Stack>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: "center", mb: 3 }}>{title}</Typography>{children}
      </Paper>
    </Box>
  );
}
