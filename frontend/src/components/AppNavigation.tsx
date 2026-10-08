"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { accountLoaded } from "@/features/auth/authSlice";
import { readCurrentAccount } from "@/features/auth/authApi";
import { ThemeModeToggle } from "./ThemeModeToggle";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const links = [
  { href: "/trip", label: "Plan a trip" },
  { href: "/trips", label: "Trip history" },
  { href: "/vehicles", label: "My vehicles" },
  { href: "/profile", label: "Profile" },
];

const producerLinks = [
  { href: "/producer", label: "Dashboard" },
  { href: "/producer/profile", label: "Profile" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const account = useSelector((state: RootState) => state.auth.account);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!account) {
      void readCurrentAccount()
        .then((current) => {
          if (!active) return;
          dispatch(accountLoaded(current));
          if (current.role === "producer") {
            router.replace(pathname === "/profile" ? "/producer/profile" : "/producer");
          }
        })
        .catch(() => undefined);
    } else if (account.role === "producer") {
      router.replace(pathname === "/profile" ? "/producer/profile" : "/producer");
    }

    return () => {
      active = false;
    };
  }, [account, dispatch, pathname, router]);

  const visibleLinks = account?.role === "producer" ? producerLinks : links;

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ minHeight: 64, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        <Typography component={Link} href="/trip" sx={{ color: "inherit", textDecoration: "none", fontWeight: 800, mr: { xs: "auto", md: 3 } }}>
          <Box component="span" aria-hidden="true" sx={{ display: "inline-block", width: 12, height: 12, border: "2px solid", borderColor: "primary.main", borderRadius: "50%", mr: 1 }} /> drivewise.
        </Typography>
        <Stack component="nav" aria-label="Main navigation" direction="row" sx={{ order: { xs: 3, md: 2 }, gap: { xs: 0, sm: 0.5 }, flex: { xs: "1 1 100%", md: "0 1 auto" }, width: { xs: "100%", md: "auto" }, maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflowX: { xs: "auto", md: "visible" }, justifyContent: { xs: "flex-start", md: "flex-start" } }}>
          {visibleLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                aria-current={active ? "page" : undefined}
                sx={{ color: active ? "primary.main" : "text.secondary", borderRadius: 5, px: 2, border: active ? "1px solid" : "1px solid transparent", borderColor: active ? "divider" : "transparent", bgcolor: active ? "action.selected" : "transparent", whiteSpace: "nowrap", "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 } }}
              >
                {link.label}
              </Button>
            );
          })}
        </Stack>
        <Box sx={{ ml: { md: "auto" }, order: { xs: 2, md: 3 }, display: "flex", alignItems: "center" }}>
          <ThemeModeToggle />
          <SignOutButton onError={setError} />
        </Box>
      </Toolbar>
      {error && <Typography role="alert" sx={{ px: 2, pb: 1, color: "error.main", textAlign: "right" }}>{error}</Typography>}
    </AppBar>
  );
}
