"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { authCleared } from "@/features/auth/authSlice";
import { logoutAccount } from "@/features/auth/authApi";
import { setCsrfToken } from "@/lib/api/client";

const links = [
  { href: "/trip", label: "Plan a trip" },
  { href: "/vehicles", label: "My vehicles" },
  { href: "/profile", label: "Profile" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      await logoutAccount();
    } catch {
      setError("Deconectarea nu a putut fi confirmată. Încearcă din nou.");
      return;
    }
    setCsrfToken(null);
    dispatch(authCleared());
    router.replace("/login");
  }

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#0e1b2c", borderBottom: "1px solid #27384a" }}>
      <Toolbar sx={{ minHeight: 64, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        <Typography component={Link} href="/trip" sx={{ color: "white", textDecoration: "none", fontWeight: 800, mr: { xs: "auto", md: 3 } }}>
          <Box component="span" sx={{ color: "#58dced", mr: 1 }}>◉</Box> drivewise.
        </Typography>
        <Stack component="nav" aria-label="Main navigation" direction="row" sx={{ order: { xs: 3, md: 2 }, gap: { xs: 0, sm: 0.5 }, flex: { xs: "1 0 100%", md: "0 1 auto" }, justifyContent: { xs: "center", md: "flex-start" } }}>
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button key={link.href} component={Link} href={link.href} aria-current={active ? "page" : undefined}
                sx={{ color: active ? "#6fe4f2" : "#c7d1df", borderRadius: 5, px: 2, border: active ? "1px solid #416579" : "1px solid transparent", bgcolor: active ? "#1b3344" : "transparent", "&:focus-visible": { outline: "2px solid #58dced", outlineOffset: 2 } }}>
                {link.label}
              </Button>
            );
          })}
        </Stack>
        <Box sx={{ ml: { md: "auto" }, order: { xs: 2, md: 3 } }}>
          <Button onClick={signOut} color="inherit" size="small" sx={{ border: "1px solid #344459", borderRadius: 5 }}>Log out</Button>
        </Box>
      </Toolbar>
      {error && <Typography role="alert" sx={{ px: 2, pb: 1, color: "#ffb4ab", textAlign: "right" }}>{error}</Typography>}
    </AppBar>
  );
}
