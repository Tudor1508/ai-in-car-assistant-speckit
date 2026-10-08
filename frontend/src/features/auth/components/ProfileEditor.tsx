"use client";

import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { updateCurrentAccount, type Account, type ProfileUpdate } from "../authApi";

type ProfileEditorProps = {
  profile: Account;
  onUpdated: (profile: Account) => void;
};

export function ProfileEditor({ profile, onUpdated }: ProfileEditorProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack component="form" key={revision} onSubmit={save} spacing={2} aria-busy={saving}>
      {notice && <Alert severity="success" role="status">{notice}</Alert>}
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      <TextField name="name" label="Full name" defaultValue={profile.name} required />
      <TextField
        name="email"
        label="Email"
        type="email"
        defaultValue={profile.email}
        required
      />
      <Box component="section" aria-label="Account role" sx={{ p: 1.75, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">Role</Typography>
        <Typography sx={{ fontWeight: 600 }}>{profile.role}</Typography>
      </Box>
      <TextField
        name="current_password"
        label="Current password (required to change your email)"
        type="password"
        autoComplete="current-password"
      />
      <Button type="submit" variant="contained" disabled={saving}>{saving ? <CircularProgress size={18} aria-label="Saving profile" sx={{ mr: 1 }} /> : null}{saving ? "Saving…" : "Save profile"}</Button>
    </Stack>
  );
}
