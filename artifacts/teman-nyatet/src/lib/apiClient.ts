// Thin client for the api-server, which now owns notes/transactions/todos/links
// data (stored in Google Sheets). Auth still goes through Supabase directly —
// we just forward the Supabase access token as a Bearer token.
import { supabase } from './supabase';

// In Replit dev, Vite proxies "/api" to the api-server (see vite.config.ts).
// In production, set VITE_API_SERVER_URL to the api-server's deployed origin
// if the frontend and api-server are not served from the same domain.
const API_BASE = (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return (body?.data ?? body) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, { headers: await authHeaders() });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return handle<void>(res);
}
