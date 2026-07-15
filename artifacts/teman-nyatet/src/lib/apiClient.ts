// Thin client for the api-server, which owns notes/transactions/todos/links
// data (stored in Google Sheets). Auth still goes through Supabase directly —
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

const API_BASE = (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let refreshPromise: Promise<string | null> | null = null;

// ─── Typed error for spreadsheet access failures ────────────────────────────
// Thrown when the API server returns a 503 with a specific error code
// (SPREADSHEET_NOT_FOUND or SPREADSHEET_ACCESS_DENIED). Data hooks catch
// this and dispatch a global 'teman-nyatet:spreadsheet-error' event so the
// AuthGuard can redirect the user to the recovery / reconnect page.

export class SpreadsheetApiError extends Error {
  constructor(
    public readonly code: 'SPREADSHEET_NOT_FOUND' | 'SPREADSHEET_ACCESS_DENIED',
    message: string,
  ) {
    super(message);
    this.name = 'SpreadsheetApiError';
  }
}

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
        console.warn('[apiClient] Session refresh failed:', error.message);
        return null;
      }
      return session?.access_token ?? null;
    } catch (err) {
      console.warn('[apiClient] Session refresh threw:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error as string | undefined;
    // Spreadsheet access errors get a typed error so hooks can trigger
    // the global recovery flow instead of just showing a toast.
    if (
      res.status === 503 &&
      (code === 'SPREADSHEET_NOT_FOUND' || code === 'SPREADSHEET_ACCESS_DENIED')
    ) {
      throw new SpreadsheetApiError(code, body?.message ?? code);
    }
    throw new Error(code ?? `Request failed with status ${res.status}`);
  }
  return (body?.data ?? body) as T;
}

async function fetchWithAuth<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getToken();
  const url = `${API_BASE}/api${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      const retryRes = await fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
      return handle<T>(retryRes);
    }

    // Refresh failed: clear the session so AuthContext sees the user as signed
    // out and AuthGuard redirects to /login.
    console.warn('[apiClient] Auth refresh failed, signing out');
    await supabase.auth.signOut();
  }

  return handle<T>(res);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return fetchWithAuth<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetchWithAuth<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
