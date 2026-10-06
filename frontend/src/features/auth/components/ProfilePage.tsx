"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { accountLoaded, authCleared } from "../authSlice";
import { readCurrentAccount } from "../authApi";
import { setCsrfToken } from "@/lib/api/client";
import { AccountSecurityDialogs } from "./AccountSecurityDialogs";
import { AuthCard } from "./AuthCard";
import { ProfileEditor } from "./ProfileEditor";
import { SignOutButton } from "./SignOutButton";

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((state: RootState) => state.auth.account);

  useEffect(() => {
    let active = true;
    readCurrentAccount()
      .then((account) => {
        if (active) dispatch(accountLoaded(account));
      })
      .catch(() => {
        if (active) {
          dispatch(authCleared());
          router.replace("/login");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, dispatch]);

  function finishAccountSession() {
    setCsrfToken(null);
    dispatch(authCleared());
    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <AuthCard title="Profile">
        <Typography role="status">Loading profile…</Typography>
      </AuthCard>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#081523", p: { xs: 2, sm: 5 } }}>
      <Box sx={{ maxWidth: 760, mx: "auto" }}>
        <Stack spacing={3} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: "#102235", color: "white", borderRadius: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>My profile</Typography>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <ProfileEditor
            profile={profile}
            onUpdated={(updated) => dispatch(accountLoaded(updated))}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AccountSecurityDialogs onDone={finishAccountSession} />
            <SignOutButton onError={setError} />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
