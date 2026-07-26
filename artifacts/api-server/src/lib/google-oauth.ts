// Per-user Google OAuth2 client for Sheets + Drive access.
// Each user authenticates once; we store their refresh_token in Supabase
// and derive a per-request Sheets client from it. No service account needed.
//
// `googleapis` is large (~100 MB parsed) and only needed at runtime when a
// user actually hits a Google OAuth / Sheets route. We lazy-import it so the
// Vercel Function cold-start doesn't have to parse it on every wake-up.
import type { drive_v3, sheets_v4 } from 'googleapis';
import crypto from 'crypto';

// Cached lazy import — resolves on first use, reused on subsequent calls.
let _googleLib: typeof import('googleapis') | null = null;
async function getGoogle(): Promise<typeof import('googleapis').google> {
  if (!_googleLib) {
    _googleLib = await import('googleapis');
  }
  return _googleLib.google;
}

const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? '';
const CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
const STATE_SECRET = process.env['GOOGLE_OAUTH_STATE_SECRET'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('[google-oauth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set.');
}
if (!STATE_SECRET) {
  console.error('[google-oauth] GOOGLE_OAUTH_STATE_SECRET is not set — OAuth state is disabled.');
}

// The redirect URI must exactly match what is registered in Google Cloud Console.
// Priority: GOOGLE_REDIRECT_URI env var → derived from REPLIT_DEV_DOMAIN → localhost fallback.
export function getRedirectUri(): string {
  const configured = process.env['GOOGLE_REDIRECT_URI'];
  if (configured) return configured;
  const replitDomain = process.env['REPLIT_DEV_DOMAIN'];
  if (replitDomain) return `https://${replitDomain}/api/auth/google/callback`;
  return 'http://localhost:5000/api/auth/google/callback';
}

export async function createOAuth2Client() {
  const google = await getGoogle();
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, getRedirectUri());
}

// Scopes: read/write spreadsheets + create files in Drive (drive.file = least privilege).
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export async function getAuthorizationUrl(state: string): Promise<string> {
  const client = await createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // always request refresh_token, even if previously granted
    scope: SCOPES,
    state,
  });
}

// Create a Sheets client using this user's refresh_token.
// The googleapis library handles access-token refresh automatically.
export async function createSheetsClient(refreshToken: string): Promise<sheets_v4.Sheets> {
  const google = await getGoogle();
  const client = await createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return google.sheets({ version: 'v4', auth: client as any });
}

// Create a Drive client using this user's refresh_token.
export async function createDriveClient(refreshToken: string): Promise<drive_v3.Drive> {
  const google = await getGoogle();
  const client = await createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return google.drive({ version: 'v3', auth: client as any });
}

// ─── CSRF-safe state parameter ───────────────────────────────────────────────
// The state embeds the userId (so we know who to connect after OAuth) and an
// expiry. It is HMAC-signed with GOOGLE_OAUTH_STATE_SECRET so Google's
// callback cannot be forged or replayed with a different userId.

interface OAuthState {
  userId: string;
  expiresAt: number; // unix ms
}

export function createState(userId: string): string {
  if (!STATE_SECRET) {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET is not configured');
  }
  const payload: OAuthState = { userId, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 min TTL
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(b64)
    .digest('hex');
  return `${b64}.${sig}`;
}

export function verifyState(state: string): OAuthState | null {
  if (!STATE_SECRET) {
    return null;
  }
  try {
    const dotIdx = state.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const b64 = state.slice(0, dotIdx);
    const sig = state.slice(dotIdx + 1);
    const expected = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(b64)
      .digest('hex');
    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(sig.padEnd(expected.length, '0'), 'hex');
    if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as OAuthState;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
