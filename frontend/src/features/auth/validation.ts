const passwordRules: Array<[RegExp, string]> = [
  [/^[\s\S]{8,}$/u, "at least 8 characters"],
  [/(?=.*\p{Lu})/u, "an uppercase letter"],
  [/(?=.*\p{N})/u, "a number"],
  [/(?=.*[^\p{L}\p{N}])/u, "a special character"],
];

export function unmetPasswordRequirements(password: string): string[] {
  return passwordRules.filter(([rule]) => !rule.test(password)).map(([, description]) => description);
}

export function passwordFormError(password: string, confirmation: string, label = "Password"): string | null {
  const unmet = unmetPasswordRequirements(password);
  if (unmet.length > 0) return `${label} must meet these requirements: ${unmet.join(", ")}.`;
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

export function safeApiErrorMessage(body: { error?: { code?: string; details?: Array<{ location?: unknown[] }> } }): string {
  const code = body.error?.code;
  const field = body.error?.details?.[0]?.location?.at(-1);
  if (code === "invalid_credentials") return "The email or password is incorrect.";
  if (code === "invalid_current_password") return "The current password is incorrect.";
  if (code === "email_unavailable") return "This email address cannot be used.";
  if (field === "email") return "Enter a valid email address.";
  if (field === "name") return "Enter a valid full name.";
  if (field === "password_confirmation") return "Passwords do not match.";
  if (field === "new_password_confirmation") return "The new passwords do not match.";
  if (field === "password" || field === "new_password") return "The password must meet all the requirements shown.";
  if (field === "current_password") return "Check your current password.";
  if (code === "validation_error") return "Check the information you entered.";
  return "The request could not be processed. Check the information and try again.";
}
