// Thin client for the api-server, which owns notes/transactions/todos/links
// data (stored in PostgreSQL). Auth still goes through Supabase directly —
// we forward the Supabase access token as a Bearer token.
//
// Access tokens expire (default 1 hour). Supabase auto-refreshes them in many
// cases, but the client-side `getSession()` can still hand back an expired
// token if the refresh hasn't run yet (e.g. after the app has been idle). So
// this client:
//   1. Sends the current access token.
//   2. On a 401, attempts to refresh the session once and retries the request.
//   3. If refresh fails, signs the user out so AuthContext redirects to login.
import { supabase } from './supabase';

type ApiLogLevel = 'info' | 'warn' | 'error';

function logApi(level: ApiLogLevel, event: string, fields: Record<string, unknown> = {}) {
  if (import.meta.env.PROD && level === 'info') return;
  const payload = { scope: 'api', event, ...fields };
  // Keep logs machine-readable in production while avoiding tokens and bodies.
  console[level](JSON.stringify(payload));
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredApiBase = (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.replace(/\/$/, '');
// The frontend and API are separate Vercel projects in production. Keep local
// development on the relative /api path so Vite can proxy to localhost:8080,
// but never let a production build send API requests into the frontend SPA
// rewrite, which returns index.html instead of an API response.
const API_BASE = configuredApiBase ?? (
  import.meta.env.PROD ? 'https://teman-nyatet-api-server.vercel.app' : ''
);

// Warn once in non-production if the API base isn't configured, so developers
// know why all API calls are going to relative /api/… paths.
if (import.meta.env.DEV && !API_BASE) {
  console.info('[apiClient] VITE_API_SERVER_URL not set — using relative /api/* (Vite proxy must be running)');
}

let refreshPromise: Promise<string | null> | null = null;

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        logApi('warn', 'auth.refresh_failed', { message: error.message });
        return null;
      }
      return session?.access_token ?? null;
    } catch (err) {
      logApi('warn', 'auth.refresh_threw', { message: err instanceof Error ? err.message : 'unknown' });
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  // Surface HTML responses as a typed error BEFORE attempting JSON parsing.
  // This happens when Vercel's SPA rewrites catch `/api/*` and serve
  // index.html from the frontend (because VITE_API_SERVER_URL wasn't set
  // or points to the wrong host) — silently returning 200 + HTML would
  // otherwise look like a successful empty result.
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new ApiError('Server mengembalikan respons yang tidak valid.', 'WRONG_RESPONSE_HTML', res.status);
  }

  // Vercel returns plain-text "DEPLOYMENT_NOT_FOUND" with a 404 when the
  // api-server project has no live deployment. Detect this early so we can
  // surface a clear, actionable message instead of "Request failed with status 404".
  if (res.status === 404) {
    const vercelError = res.headers.get('x-vercel-error');
    if (vercelError === 'DEPLOYMENT_NOT_FOUND') {
      throw new ApiError('Server belum tersedia.', 'SERVER_NOT_DEPLOYED', res.status);
    }
    // Generic 404 from a deployed server (route not found) — fall through.
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error as string | undefined;
    throw new ApiError(body?.message ?? `Request failed with status ${res.status}`, code ?? 'HTTP_ERROR', res.status);
  }
  return (body?.data ?? body) as T;
}

async function fetchWithAuth<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getToken();
  const url = `${API_BASE}/api${path}`;
  const startedAt = performance.now();
  const method = init.method ?? 'GET';

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (networkErr) {
    // fetch() itself threw — either a CORS preflight rejection or the host is
    // unreachable. Surface a descriptive error instead of an untyped TypeError.
    const isCors = networkErr instanceof TypeError && networkErr.message.toLowerCase().includes('cors');
    if (isCors) {
      logApi('error', 'request.cors_blocked', { method, path });
      throw new ApiError('Koneksi ke server diblokir.', 'CORS_BLOCKED');
    }
    logApi('warn', 'request.network_error', { method, path });
    throw new ApiError('Tidak dapat terhubung ke server.', 'NETWORK_ERROR');
  }

  logApi(res.ok ? 'info' : 'warn', 'request.completed', {
    method,
    path,
    status: res.status,
    durationMs: Math.round(performance.now() - startedAt),
  });

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      let retryRes: Response;
      try {
        retryRes = await fetch(url, {
          ...init,
          headers: {
            ...init.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      } catch {
        throw new ApiError('Tidak dapat terhubung ke server.', 'NETWORK_ERROR');
      }
      return handle<T>(retryRes);
    }

    // Refresh failed: clear the session so AuthContext sees the user as signed
    // out and AuthGuard redirects to /login.
    logApi('warn', 'auth.sign_out_after_refresh_failure');
    await supabase.auth.signOut();
  }

  return handle<T>(res);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return fetchWithAuth<T>(path, { method: 'GET' });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return fetchWithAuth<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return fetchWithAuth<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  return fetchWithAuth<void>(path, { method: 'DELETE' });
}

// For multipart uploads (e.g. profile photo) — do NOT set Content-Type here,
// the browser needs to add its own multipart boundary.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return fetchWithAuth<T>(path, {
    method: 'POST',
    body: formData,
  });
}
