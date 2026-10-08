"use client";

import Link from "next/link";
import { Box, Button } from "@mui/material";
import { ProfilePage } from "@/features/auth/components/ProfilePage";

export default function ProducerProfilePage() {
  return (
    <Box sx={{ bgcolor: "background.default", color: "text.primary", py: { xs: 2, sm: 4 } }}>
      <Box sx={{ maxWidth: 920, mx: "auto", px: { xs: 2, sm: 3 } }}>
        <Button component={Link} href="/producer" startIcon="←" sx={{ mb: 2 }}>Back to dashboard</Button>
        <ProfilePage />
      </Box>
    </Box>
  );
}
