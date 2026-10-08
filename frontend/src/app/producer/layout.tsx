"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import type { AppDispatch } from "@/lib/store";
import { accountLoaded, authCleared } from "@/features/auth/authSlice";
import { logoutAccount, readCurrentAccount } from "@/features/auth/authApi";
import { setCsrfToken } from "@/lib/api/client";
import { DashboardThemeToggle, useDashboardThemeMode } from "@/components/DashboardThemeMode";

const links = [
  { href: "/producer", label: "Dashboard" },
  { href: "/producer/profile", label: "Profile" },
];

function defaultDestination(role: string) {
  if (role === "admin") return "/admin";
  if (role === "producer") return "/producer";
  return "/trip";
}

export default function ProducerLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { mode, theme, toggleMode } = useDashboardThemeMode();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    readCurrentAccount().then((account) => {
      if (!active) return;
      if (account.role !== "producer") {
        router.replace(defaultDestination(account.role));
        return;
      }
      dispatch(accountLoaded(account));
      setAuthorized(true);
    }).catch(() => {
      if (active) router.replace("/login");
    });
    return () => { active = false; };
  }, [dispatch, router]);

  async function signOut() {
    setError("");
    try {
      await logoutAccount();
    } catch {
      setError("Sign out could not be confirmed. Please try again.");
      return;
    }
    setCsrfToken(null);
    dispatch(authCleared());
    router.replace("/");
  }

  if (!authorized) {
    return <ThemeProvider theme={theme}><Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", color: "text.secondary" }} role="status">Checking Producer access…</Box></ThemeProvider>;
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}>
          <Toolbar sx={{ minHeight: 72, gap: 1.5, flexWrap: "wrap" }}>
            <Typography component={Link} href="/producer" sx={{ color: "inherit", textDecoration: "none", fontWeight: 800, fontSize: 20, mr: { xs: "auto", md: 2 } }}>
              drivewise<Box component="span" sx={{ color: "primary.main" }}>.</Box>
            </Typography>
            <Stack component="nav" aria-label="Producer navigation" direction="row" sx={{ order: { xs: 3, md: 2 }, flex: { xs: "1 0 100%", md: "0 1 auto" }, gap: .5, overflowX: "auto", justifyContent: { xs: "flex-start", md: "center" } }}>
              {links.map(({ label, href }) => {
                const active = pathname === href;
                return <Button key={href} component={Link} href={href} aria-current={active ? "page" : undefined} sx={{ whiteSpace: "nowrap", px: 2, borderRadius: 2, color: active ? "primary.main" : "text.secondary", bgcolor: active ? "action.selected" : "transparent", fontWeight: active ? 700 : 500 }}>{label}</Button>;
              })}
            </Stack>
            <Stack direction="row" sx={{ ml: { md: "auto" }, order: { xs: 2, md: 3 }, alignItems: "center" }}>
              <DashboardThemeToggle mode={mode} onToggle={toggleMode} />
              <Button onClick={signOut} sx={{ borderRadius: 2, color: "text.secondary" }}>Log out</Button>
            </Stack>
          </Toolbar>
          {error && <Typography role="alert" sx={{ px: 3, pb: 1, color: "error.main", textAlign: "right" }}>{error}</Typography>}
        </AppBar>
        {children}
      </Box>
    </ThemeProvider>
  );
}
