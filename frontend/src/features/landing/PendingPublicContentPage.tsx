"use client";

import Link from "next/link";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function PendingPublicContentPage({ title }: { title: "Contact" | "Privacy" }) {
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
    <Box component="header" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Stack direction="row" sx={{ maxWidth: 1100, mx: "auto", px: 2, minHeight: 68, alignItems: "center", justifyContent: "space-between" }}>
        <Button component={Link} href="/" color="inherit" sx={{ fontWeight: 800, textTransform: "none" }}>drivewise<Box component="span" sx={{ color: "primary.main" }}>.</Box></Button>
        <ThemeModeToggle />
      </Stack>
    </Box>
    <Box component="main" sx={{ maxWidth: 760, mx: "auto", p: { xs: 2, sm: 4 }, pt: { xs: 6, sm: 10 } }}>
      <Paper sx={{ p: { xs: 3, sm: 5 }, bgcolor: "background.paper" }}>
        <Stack spacing={2}>
          <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.7rem" }, fontWeight: 800 }}>{title}</Typography>
          <Alert severity="info" role="status">This page’s content is blocked until the project owner provides and approves it.</Alert>
          <Button component={Link} href="/" sx={{ alignSelf: "flex-start" }}>Back to home</Button>
        </Stack>
      </Paper>
    </Box>
  </Box>;
}
