"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { accountLoaded } from "../authSlice";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { AuthCard } from "./AuthCard";
import { loginAccount, readCurrentAccount } from "../authApi";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let active = true;
    readCurrentAccount().then((account) => {
      if (!active) return;
      dispatch(accountLoaded(account));
      router.replace(account.role === "admin" ? "/admin" : "/trip");
    }).catch(() => {
      // An anonymous or expired session should be able to use the sign-in form.
    }).finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [dispatch, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await loginAccount(values as { email: string; password: string });
      dispatch(accountLoaded(result.account));
      router.push(result.account.role === "admin" ? "/admin" : "/trip");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The email or password is incorrect.");
    } finally { setBusy(false); }
  }
  return <AuthCard title="Sign in"><Stack component="form" onSubmit={submit} spacing={2}>
    <TextField name="email" label="Email" type="email" required autoComplete="email" />
    <TextField name="password" label="Password" type="password" required autoComplete="current-password" />
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Button type="submit" variant="contained" disabled={busy || checkingSession}>Sign in</Button>
    <Typography sx={{ textAlign: "center" }}>New here? <Link href="/register">Create an account</Link></Typography>
  </Stack></AuthCard>;
}
