"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { authCleared } from "../authSlice";
import { logoutAccount } from "../authApi";

export function SignOutButton({ onError }: { onError: (message: string) => void }) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  async function signOut() {
    onError("");
    try {
      await logoutAccount();
      dispatch(authCleared());
      router.replace("/login");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Deconectarea nu a reușit.");
    }
  }

  return <Button onClick={signOut}>Deconectare</Button>;
}
