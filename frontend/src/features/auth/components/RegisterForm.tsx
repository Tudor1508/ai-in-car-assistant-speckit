"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { AuthCard } from "./AuthCard";
import { registerAccount } from "../authApi";
import { passwordFormError } from "../validation";

export function RegisterForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const passwordError = passwordFormError(
      String(form.get("password") ?? ""),
      String(form.get("password_confirmation") ?? ""),
    );
    if (passwordError) { setError(passwordError); return; }
    setBusy(true);
    try {
      await registerAccount(Object.fromEntries(form.entries()) as {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
      });
      setSuccess(true); formElement.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Înregistrarea nu a reușit."); }
    finally { setBusy(false); }
  }
  return <AuthCard title="Creează cont">
    {success ? <Stack spacing={2}><Alert severity="success">Contul a fost creat. Emailul este neverificat.</Alert><Button component={Link} href="/login" variant="contained">Autentificare</Button></Stack> :
      <Stack component="form" onSubmit={submit} spacing={2}>
        <TextField name="name" label="Nume complet" required slotProps={{ htmlInput: { maxLength: 120 } }} />
        <TextField name="email" label="Email" type="email" required />
        <TextField name="password" label="Parolă" type="password" required helperText="Minimum 8 caractere, o literă mare, o cifră și un caracter special." />
        <TextField name="password_confirmation" label="Confirmă parola" type="password" required />
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Button type="submit" variant="contained" disabled={busy}>Creează cont</Button>
        <Typography sx={{ textAlign: "center" }}>Ai deja cont? <Link href="/login">Autentifică-te</Link></Typography>
      </Stack>}
  </AuthCard>;
}
