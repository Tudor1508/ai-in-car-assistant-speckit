const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
let csrfToken: string | null = null;

type SuccessEnvelope<T> = { data: T };
type ApiErrorDetails = Array<{ location?: unknown[]; message?: string }>;
type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetails;
  };
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

async function bootstrapCsrf(): Promise<string> {
  const response = await fetch(`${apiBase}/auth/csrf/bootstrap`, {
    method: "POST",
    credentials: "include",
  });
  const body = (await response.json()) as SuccessEnvelope<{ csrf_token: string }> & ErrorEnvelope;
  if (!response.ok) {
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request could not be completed",
      body.error?.details,
    );
  }
  csrfToken = body.data.csrf_token;
  return csrfToken;
}

export async function apiRequest<T>(
  path: string,
  method = "GET",
  payload?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD"].includes(method)) {
    headers["X-CSRF-Token"] = csrfToken ?? (await bootstrapCsrf());
  }
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    credentials: "include",
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = (await response.json()) as SuccessEnvelope<T> & ErrorEnvelope;
  if (!response.ok) {
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request could not be completed",
      body.error?.details,
    );
  }
  return body.data;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}
