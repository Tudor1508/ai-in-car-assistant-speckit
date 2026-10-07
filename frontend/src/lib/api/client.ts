function getApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured.");
  return apiBase.replace(/\/$/, "");
}
let csrfToken: string | null = null;
let csrfBootstrapPromise: Promise<string> | null = null;

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
  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = (async () => {
      const response = await fetch(`${getApiBase()}/auth/csrf/bootstrap`, {
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
    })();
  }
  try {
    return await csrfBootstrapPromise;
  } finally {
    csrfBootstrapPromise = null;
  }
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
  const send = () => fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    credentials: "include",
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  let response = await send();
  let body = (await response.json()) as SuccessEnvelope<T> & ErrorEnvelope;
  // The server rotates CSRF tokens during bootstrap and sessions can also
  // expire while this tab remains open. Refresh once when a mutation is
  // rejected for a stale token, then retry with the newly bound token.
  if (
    response.status === 403 &&
    body.error?.code === "invalid_csrf" &&
    !["GET", "HEAD"].includes(method)
  ) {
    headers["X-CSRF-Token"] = await bootstrapCsrf();
    response = await send();
    body = (await response.json()) as SuccessEnvelope<T> & ErrorEnvelope;
  }
  if (!response.ok) {
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request could not be completed",
      body.error?.details,
    );
  }
  return body.data;
}

export async function apiRequestBlob(path: string, payload: unknown, signal?: AbortSignal): Promise<Blob> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken ?? (await bootstrapCsrf()),
  };
  const send = () => fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });
  let response = await send();
  const readError = async (failedResponse: Response): Promise<ErrorEnvelope> => {
    try {
      return await failedResponse.clone().json() as ErrorEnvelope;
    } catch {
      return {};
    }
  };
  let body: ErrorEnvelope | undefined = response.ok ? undefined : await readError(response);
  if (response.status === 403 && body?.error?.code === "invalid_csrf") {
    headers["X-CSRF-Token"] = await bootstrapCsrf();
    response = await send();
    body = response.ok ? undefined : await readError(response);
  }
  if (!response.ok) {
    throw new ApiClientError(
      body?.error?.code ?? "request_failed",
      body?.error?.message ?? "The request could not be completed",
      body?.error?.details,
    );
  }
  return response.blob();
}

export async function apiUploadFile<T>(path: string, file: File): Promise<T> {
  const send = (token: string) => fetch(`${getApiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type, "X-CSRF-Token": token },
    body: file,
  });
  let token = csrfToken ?? await bootstrapCsrf();
  let response = await send(token);
  let body = await response.json() as SuccessEnvelope<T> & ErrorEnvelope;
  if (response.status === 403 && body.error?.code === "invalid_csrf") {
    token = await bootstrapCsrf();
    response = await send(token);
    body = await response.json() as SuccessEnvelope<T> & ErrorEnvelope;
  }
  if (!response.ok) {
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request could not be completed",
      body.error?.details,
    );
  }
  return body.data;
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const response = await fetch(`${getApiBase()}${path}`, { credentials: "include" });
  if (!response.ok) {
    let body: ErrorEnvelope = {};
    try {
      body = await response.json() as ErrorEnvelope;
    } catch {
      // Use the established generic error if the image endpoint has no JSON body.
    }
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The image could not be loaded",
      body.error?.details,
    );
  }
  return response.blob();
}

export async function apiRequestAudio<T>(path: string, audio: Blob, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": audio.type || "application/octet-stream",
    "X-CSRF-Token": csrfToken ?? (await bootstrapCsrf()),
  };
  const send = () => fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: audio,
    signal,
  });
  const readBody = async (response: Response) => {
    try {
      return await response.clone().json() as SuccessEnvelope<T> & ErrorEnvelope;
    } catch {
      return {} as SuccessEnvelope<T> & ErrorEnvelope;
    }
  };
  let response = await send();
  let body = await readBody(response);
  if (response.status === 403 && body.error?.code === "invalid_csrf") {
    headers["X-CSRF-Token"] = await bootstrapCsrf();
    response = await send();
    body = await readBody(response);
  }
  if (!response.ok) {
    throw new ApiClientError(
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request could not be completed",
      body.error?.details,
    );
  }
  return body.data as T;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}
