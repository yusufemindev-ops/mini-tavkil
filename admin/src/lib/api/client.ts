import { env } from '@/lib/env';

const API_BASE_URL = env.apiBaseUrl;

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: Record<string, unknown>;
  };
}

interface SuccessEnvelope<T> {
  data: T;
}

// Carries the backend error `code` so callers can branch on it (e.g. show a
// localized message for a specific failure).
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  // Extra error context. For `validation.failed` this holds `{ issues: ZodIssue[] }`,
  // which `apiFieldErrors()` maps onto specific form fields.
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// The app registers this to react to a terminal auth failure (a 401) — typically
// clear the session cache and redirect to /login. Better Auth manages the session
// cookie itself and there is no token refresh, so a 401 is final.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      credentials: 'include',
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('network.unreachable', 'Could not reach the server.', 0);
  }

  // 401 → the Better Auth session is gone/expired. No refresh exists, so this is
  // terminal: notify the app (clear session + redirect to login).
  if (res.status === 401) {
    onUnauthorized?.();
  }

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = payload as ErrorEnvelope | null;
    throw new ApiError(
      envelope?.error?.code ?? 'internal.unhandled',
      envelope?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      envelope?.error?.details,
    );
  }

  return (payload as SuccessEnvelope<T>).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Upload a single file as multipart/form-data. We can't go through `request()`
// because that forces `Content-Type: application/json`; for multipart the browser
// MUST set the header itself (it injects the multipart boundary). We reuse the
// base URL, the session cookie, the 401 handling, and the { data } unwrap + ApiError
// mapping so callers get the same contract as the rest of the client.
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new ApiError('network.unreachable', 'Could not reach the server.', 0);
  }

  if (res.status === 401) {
    onUnauthorized?.();
  }

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = payload as ErrorEnvelope | null;
    throw new ApiError(
      envelope?.error?.code ?? 'internal.unhandled',
      envelope?.error?.message ?? `Upload failed (${res.status})`,
      res.status,
    );
  }

  return (payload as SuccessEnvelope<T>).data;
}
