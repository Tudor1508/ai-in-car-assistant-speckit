"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppBar, Box, Button, IconButton, Menu, MenuItem, Stack, Toolbar, Typography } from "@mui/material";
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
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<HTMLElement | null>(null);

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
  const mobileMenuOpen = Boolean(mobileMenuAnchor);

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ minHeight: 64, display: "flex", flexWrap: "nowrap", gap: { xs: 1, md: 1.5 } }}>
        <IconButton
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-haspopup="menu"
          onClick={(event) => {
            const anchor = event.currentTarget;
            setMobileMenuAnchor((current) => current ? null : anchor);
          }}
          aria-controls={mobileMenuOpen ? "mobile-main-navigation" : undefined}
          sx={{ display: { xs: "inline-flex", md: "none" }, color: "text.primary", p: 1 }}
        >
          <Box aria-hidden="true" sx={{ width: 22, height: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", py: "2px" }}>
            {[0, 1, 2].map((line) => <Box key={line} sx={{ height: 2, width: "100%", borderRadius: 2, bgcolor: "currentColor" }} />)}
          </Box>
        </IconButton>
        <Menu
          anchorEl={mobileMenuAnchor}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ list: { id: "mobile-main-navigation", "aria-label": "Main navigation" } }}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          {visibleLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <MenuItem
                key={link.href}
                component={Link}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileMenuAnchor(null)}
                sx={{ minWidth: 200, color: active ? "primary.main" : "text.primary", fontWeight: active ? 700 : 400 }}
              >
                {link.label}
              </MenuItem>
            );
          })}
        </Menu>
        <Typography component={Link} href="/trip" sx={{ display: { xs: "none", md: "block" }, color: "inherit", textDecoration: "none", fontWeight: 800, mr: 3, whiteSpace: "nowrap" }}>
          <Box component="span" aria-hidden="true" sx={{ display: "inline-block", width: 12, height: 12, border: "2px solid", borderColor: "primary.main", borderRadius: "50%", mr: 1 }} /> drivewise.
        </Typography>
        <Stack component="nav" aria-label="Main navigation" direction="row" sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, minWidth: 0 }}>
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
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <ThemeModeToggle />
          <SignOutButton onError={setError} />
        </Box>
      </Toolbar>
      {error && <Typography role="alert" sx={{ px: 2, pb: 1, color: "error.main", textAlign: "right" }}>{error}</Typography>}
    </AppBar>
  );
}
