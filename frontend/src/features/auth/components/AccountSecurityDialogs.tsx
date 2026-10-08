"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
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
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setAction(null);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (action === "password") {
      const validation = passwordFormError(
        String(values.new_password ?? ""),
        String(values.new_password_confirmation ?? ""),
        "New password",
      );
      if (validation) {
        setError(validation);
        return;
      }
    }
    setBusy(true);
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
      setError(cause instanceof Error ? cause.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button onClick={() => { setError(""); setAction("password"); }}>Change password</Button>
        <Button color="error" onClick={() => { setError(""); setAction("deactivate"); }}>Deactivate account</Button>
      </Stack>
      <Dialog open={action !== null} onClose={close} fullWidth aria-labelledby="account-security-title">
        <DialogTitle id="account-security-title">
          {action === "password" ? "Change password" : "Deactivate account"}
        </DialogTitle>
        <form key={action ?? "closed"} onSubmit={submit} aria-busy={busy}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error" role="alert" aria-live="assertive">{error}</Alert>}
              <TextField
                name="current_password"
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
              />
              {action === "password" ? (
                <>
                  <TextField
                    name="new_password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    helperText="At least 8 characters, an uppercase letter, a number, and a special character."
                  />
                  <TextField
                    name="new_password_confirmation"
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={busy}
                  />
                </>
              ) : (
                <TextField
                  name="confirmation"
                  label="Type DELETE to confirm"
                  required
                  disabled={busy}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={close} disabled={busy}>Cancel</Button>
            <Button type="submit" color="error" disabled={busy}>
              {busy ? <CircularProgress size={18} aria-label="Processing request" sx={{ mr: 1 }} /> : null}
              {busy ? "Processing…" : "Confirm"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
