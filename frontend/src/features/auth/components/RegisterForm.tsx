"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { AuthCard } from "./AuthCard";
import { registerAccount } from "../authApi";
import { passwordFormError } from "../validation";

export function RegisterForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const passwordError = passwordFormError(String(form.get("password") ?? ""), String(form.get("password_confirmation") ?? ""));
    if (passwordError) { setError(passwordError); return; }
    setBusy(true);
    try {
      await registerAccount(Object.fromEntries(form.entries()) as { name: string; email: string; password: string; password_confirmation: string });
      setSuccess(true);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration failed.");
    } finally { setBusy(false); }
  }
  return <AuthCard title="Create an account">
    {success ? <Stack spacing={2}><Alert severity="success" role="status">Your account was created.</Alert><Button component={Link} href="/login" variant="contained">Sign in</Button></Stack> :
      <Stack component="form" onSubmit={submit} spacing={2} aria-busy={busy}>
        <TextField name="name" label="Full name" required disabled={busy} slotProps={{ htmlInput: { maxLength: 120 } }} />
        <TextField name="email" label="Email" type="email" required disabled={busy} />
        <TextField name="password" label="Password" type="password" required disabled={busy} helperText="At least 8 characters, an uppercase letter, a number, and a special character." />
        <TextField name="password_confirmation" label="Confirm password" type="password" required disabled={busy} />
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={18} aria-label="Creating account" sx={{ mr: 1 }} /> : null}{busy ? "Creating account…" : "Create account"}</Button>
        <Typography sx={{ textAlign: "center" }}>Already have an account? <Link href="/login">Sign in</Link></Typography>
      </Stack>}
  </AuthCard>;
}
