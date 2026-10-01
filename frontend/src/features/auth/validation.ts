const passwordRules: Array<[RegExp, string]> = [
  [/^[\s\S]{8,}$/u, "cel puțin 8 caractere"],
  [/(?=.*\p{Lu})/u, "o literă mare"],
  [/(?=.*\p{N})/u, "o cifră"],
  [/(?=.*[^\p{L}\p{N}])/u, "un caracter special"],
];

export function unmetPasswordRequirements(password: string): string[] {
  return passwordRules
    .filter(([rule]) => !rule.test(password))
    .map(([, description]) => description);
}

export function passwordFormError(
  password: string,
  confirmation: string,
  label = "Parola",
): string | null {
  const unmet = unmetPasswordRequirements(password);
  if (unmet.length > 0) {
    return `${label} trebuie să respecte cerințele: ${unmet.join(", ")}.`;
  }
  if (password !== confirmation) {
    return "Parolele nu se potrivesc.";
  }
  return null;
}

export function safeApiErrorMessage(body: {
  error?: {
    code?: string;
    details?: Array<{ location?: unknown[] }>;
  };
}): string {
  const code = body.error?.code;
  const field = body.error?.details?.[0]?.location?.at(-1);
  if (code === "invalid_credentials") return "Emailul sau parola sunt incorecte.";
  if (code === "invalid_current_password") return "Parola curentă este incorectă.";
  if (code === "email_unavailable") return "Adresa de email nu poate fi folosită.";
  if (field === "email") return "Introdu o adresă de email validă.";
  if (field === "name") return "Introdu un nume complet valid.";
  if (field === "password_confirmation") return "Parolele nu se potrivesc.";
  if (field === "new_password_confirmation") return "Parolele noi nu se potrivesc.";
  if (field === "password" || field === "new_password") {
    return "Parola trebuie să respecte toate cerințele afișate.";
  }
  if (field === "current_password") return "Verifică parola curentă.";
  if (code === "validation_error") return "Verifică informațiile introduse.";
  return "Cererea nu a putut fi procesată. Verifică informațiile și încearcă din nou.";
}
