"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { accountLoaded, authCleared } from "../authSlice";
import { readCurrentAccount } from "../authApi";
import { setCsrfToken } from "@/lib/api/client";
import { AccountSecurityDialogs } from "./AccountSecurityDialogs";
import { ProfileEditor } from "./ProfileEditor";

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
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
    router.replace("/");
  }

  if (loading || !profile) {
    return (
      <Box sx={{ minHeight: "calc(100vh - 64px)", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default", color: "text.primary" }}>
        <Typography role="status">Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "background.default", color: "text.primary", p: { xs: 2, sm: 5 } }}>
      <Box sx={{ maxWidth: 760, mx: "auto" }}>
        <Stack spacing={3} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: "background.paper", color: "text.primary", borderRadius: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>My profile</Typography>
          <ProfileEditor
            profile={profile}
            onUpdated={(updated) => dispatch(accountLoaded(updated))}
          />
          <AccountSecurityDialogs onDone={finishAccountSession} />
        </Stack>
      </Box>
    </Box>
  );
}
