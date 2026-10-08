"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { accountLoaded } from "@/features/auth/authSlice";
import { readCurrentAccount } from "@/features/auth/authApi";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const links = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Vehicles", href: "/admin/vehicles" },
  { label: "Producers", href: "/admin/producers" },
];

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    readCurrentAccount().then((account) => {
      if (!active) return;
      if (account.role !== "admin") { router.replace("/trip"); return; }
      dispatch(accountLoaded(account));
      setAuthorized(true);
    }).catch(() => { if (active) router.replace("/login"); });
    return () => { active = false; };
  }, [dispatch, router]);

  if (!authorized) return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", color: "text.secondary" }} role="status">Checking administrator access…</Box>;

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ minHeight: 72, gap: 1.5, flexWrap: "wrap" }}>
        <Typography component={Link} href="/admin" sx={{ color: "inherit", textDecoration: "none", fontWeight: 800, fontSize: 20, mr: { xs: "auto", md: 2 } }}>
          drivewise<Box component="span" sx={{ color: "primary.main" }}>.</Box><Typography component="span" variant="caption" sx={{ ml: 1.5, color: "text.secondary", fontWeight: 500 }}>ADMIN</Typography>
        </Typography>
        <Stack component="nav" aria-label="Admin navigation" direction="row" sx={{ order: { xs: 3, md: 2 }, flex: { xs: "1 0 100%", md: "0 1 auto" }, gap: .5, overflowX: "auto", justifyContent: { xs: "flex-start", md: "center" } }}>
          {links.map(({ label, href }) => {
            const active = pathname === href;
            return <Button key={href} component={Link} href={href} aria-current={active ? "page" : undefined} sx={{ whiteSpace: "nowrap", px: 2, borderRadius: 2, color: active ? "primary.main" : "text.secondary", bgcolor: active ? "action.selected" : "transparent", fontWeight: active ? 700 : 500, "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 } }}>{label}</Button>;
          })}
        </Stack>
        <Stack direction="row" sx={{ ml: { md: "auto" }, order: { xs: 2, md: 3 }, alignItems: "center" }}>
          <ThemeModeToggle />
          <SignOutButton onError={setError} />
        </Stack>
      </Toolbar>
      {error && <Typography role="alert" sx={{ px: 3, pb: 1, color: "error.main", textAlign: "right" }}>{error}</Typography>}
    </AppBar>
    {children}
  </Box>;
}
