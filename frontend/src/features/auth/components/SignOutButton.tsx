"use client";

import { Button } from "@mui/material";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { authCleared } from "../authSlice";
import { logoutAccount } from "../authApi";

export function SignOutButton({ onError }: { onError: (message: string) => void }) {
  const dispatch = useDispatch<AppDispatch>();

  async function signOut() {
    onError("");
    try {
      await logoutAccount();
      dispatch(authCleared());
      window.location.replace("/");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Sign out failed.");
    }
  }

  return <Button onClick={signOut} variant="outlined" sx={{ borderRadius: 5, "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 } }}>Log out</Button>;
}
