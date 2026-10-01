"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/lib/store";
import { accountLoaded } from "../authSlice";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { AuthCard } from "./AuthCard";
import { loginAccount } from "../authApi";

export function LoginForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter(); const dispatch = useDispatch<AppDispatch>();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { const result = await loginAccount(values as { email: string; password: string }); dispatch(accountLoaded(result.account)); router.push("/profile"); }
    catch (e) { setError(e instanceof Error ? e.message : "Emailul sau parola sunt incorecte."); }
    finally { setBusy(false); }
  }
  return <AuthCard title="Autentificare"><Stack component="form" onSubmit={submit} spacing={2}>
    <TextField name="email" label="Email" type="email" required autoComplete="email" />
    <TextField name="password" label="Parolă" type="password" required autoComplete="current-password" />
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Button type="submit" variant="contained" disabled={busy}>Autentificare</Button>
    <Typography sx={{ textAlign: "center" }}>Nu ai cont? <Link href="/register">Creează cont</Link></Typography>
  </Stack></AuthCard>;
}
