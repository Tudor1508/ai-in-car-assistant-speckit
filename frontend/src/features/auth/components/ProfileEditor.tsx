"use client";

import { useState } from "react";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { updateCurrentAccount, type Account, type ProfileUpdate } from "../authApi";

type ProfileEditorProps = {
  profile: Account;
  onUpdated: (profile: Account) => void;
};

export function ProfileEditor({ profile, onUpdated }: ProfileEditorProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    ) as Record<string, FormDataEntryValue>;
    if (values.email === profile.email) {
      delete values.email;
      delete values.current_password;
    }
    if (!values.current_password) delete values.current_password;
    try {
      const updated = await updateCurrentAccount(values as ProfileUpdate);
      onUpdated(updated);
      setNotice("Your profile has been updated.");
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The update failed.");
    }
  }

  return (
    <Stack component="form" key={revision} onSubmit={save} spacing={2}>
      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      <TextField name="name" label="Full name" defaultValue={profile.name} required />
      <TextField
        name="email"
        label="Email"
        type="email"
        defaultValue={profile.email}
        required
        helperText="Unverified"
      />
      <Alert severity="info" role="status">Your email address is unverified.</Alert>
      <TextField label="Role" value={profile.role} slotProps={{ input: { readOnly: true } }} />
      <TextField
        name="current_password"
        label="Current password (required to change your email)"
        type="password"
        autoComplete="current-password"
      />
      <Button type="submit" variant="contained">Save profile</Button>
    </Stack>
  );
}
