"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import {
  changeCurrentPassword,
  deactivateCurrentAccount,
  type AccountDeactivation,
  type PasswordChange,
} from "../authApi";
import { passwordFormError } from "../validation";

type SecurityAction = "password" | "deactivate";

type AccountSecurityDialogsProps = {
  onDone: () => void;
};

export function AccountSecurityDialogs({ onDone }: AccountSecurityDialogsProps) {
  const [action, setAction] = useState<SecurityAction | null>(null);
  const [error, setError] = useState("");

  function close() {
    setAction(null);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (action === "password") {
      const validation = passwordFormError(
        String(values.new_password ?? ""),
        String(values.new_password_confirmation ?? ""),
        "Parola nouă",
      );
      if (validation) {
        setError(validation);
        return;
      }
    }
    try {
      if (action === "password") {
        await changeCurrentPassword(values as PasswordChange);
      } else if (action === "deactivate") {
        await deactivateCurrentAccount(values as AccountDeactivation);
      } else {
        return;
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operația nu a reușit.");
    }
  }

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button onClick={() => { setError(""); setAction("password"); }}>Schimbă parola</Button>
        <Button color="error" onClick={() => { setError(""); setAction("deactivate"); }}>Dezactivează contul</Button>
      </Stack>
      <Dialog open={action !== null} onClose={close} fullWidth aria-labelledby="account-security-title">
        <DialogTitle id="account-security-title">
          {action === "password" ? "Schimbă parola" : "Dezactivează contul"}
        </DialogTitle>
        <form key={action ?? "closed"} onSubmit={submit}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error" role="alert" aria-live="assertive">{error}</Alert>}
              <TextField
                name="current_password"
                label="Parola curentă"
                type="password"
                autoComplete="current-password"
                required
              />
              {action === "password" ? (
                <>
                  <TextField
                    name="new_password"
                    label="Parolă nouă"
                    type="password"
                    autoComplete="new-password"
                    required
                    helperText="Minimum 8 caractere, o literă mare, o cifră și un caracter special."
                  />
                  <TextField
                    name="new_password_confirmation"
                    label="Confirmă parola nouă"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </>
              ) : (
                <TextField
                  name="confirmation"
                  label="Scrie DELETE pentru confirmare"
                  required
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Anulează</Button>
            <Button type="submit" color="error">Confirmă</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
