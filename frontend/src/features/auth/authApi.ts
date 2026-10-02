import { ApiClientError, apiRequest, setCsrfToken } from "@/lib/api/client";
import { safeApiErrorMessage } from "./validation";

export type Account = {
  id: string;
  name: string;
  email: string;
  email_verified: false;
  role: "user" | "admin" | "producer";
};

export type LoginResult = { account: Account; csrf_token: string };
export type ProfileUpdate = { name?: string; email?: string; current_password?: string };
export type PasswordChange = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};
export type AccountDeactivation = { current_password: string; confirmation: "DELETE" };

async function authRequest<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (cause) {
    if (cause instanceof ApiClientError) {
      throw new Error(
        safeApiErrorMessage({ error: { code: cause.code, details: cause.details } }),
      );
    }
    throw cause;
  }
}

export function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<Account> {
  return authRequest(apiRequest<Account>("/auth/register", "POST", payload));
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  // A stale in-memory token can outlive or become detached from the anonymous
  // cookie context (for example after another tab bootstraps CSRF). Start login
  // with a fresh token bound to the cookie currently held by this browser.
  setCsrfToken(null);
  const result = await authRequest(apiRequest<LoginResult>("/auth/login", "POST", payload));
  setCsrfToken(result.csrf_token);
  return result;
}

export async function logoutAccount(): Promise<{ status: "signed_out" }> {
  const result = await authRequest(
    apiRequest<{ status: "signed_out" }>("/auth/logout", "POST", {}),
  );
  setCsrfToken(null);
  return result;
}

export function readCurrentAccount(): Promise<Account> {
  return authRequest(apiRequest<Account>("/auth/me"));
}

export function updateCurrentAccount(payload: ProfileUpdate): Promise<Account> {
  return authRequest(apiRequest<Account>("/auth/me", "PATCH", payload));
}

export async function changeCurrentPassword(
  payload: PasswordChange,
): Promise<{ status: "password_changed" }> {
  const result = await authRequest(
    apiRequest<{ status: "password_changed" }>("/auth/me/password", "POST", payload),
  );
  setCsrfToken(null);
  return result;
}

export async function deactivateCurrentAccount(
  payload: AccountDeactivation,
): Promise<{ status: "disabled" }> {
  const result = await authRequest(
    apiRequest<{ status: "disabled" }>("/auth/me", "DELETE", payload),
  );
  setCsrfToken(null);
  return result;
}
