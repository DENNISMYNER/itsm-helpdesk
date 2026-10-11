/** Error thrown for every non-2xx response; `code` mirrors the server's stable error codes. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

type Query = Record<string, string | number | boolean | readonly string[] | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ''}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON (proxy error page, ...): fall through to the generic message.
  }
  return new ApiError(
    response.status,
    body?.error?.code ?? 'HTTP_ERROR',
    body?.error?.message ?? `Request failed (${response.status})`,
    body?.error?.details,
  );
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};

/** Per-field messages from a 400 VALIDATION_ERROR response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR' || !Array.isArray(error.details)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const item of error.details as Array<{ path?: string; message?: string }>) {
    if (item.path && item.message && !result[item.path]) result[item.path] = item.message;
  }
  return result;
}

/** A message that is safe to show in the UI for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
