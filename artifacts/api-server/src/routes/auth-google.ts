// Google OAuth routes — per-user Sheets + Drive access.
//
// Flow:
//   1. Frontend fetches GET /api/auth/google/initiate (Bearer token required)
//      → returns { data: { url } }
//   2. Frontend sets window.location.href = url
//   3. User consents on Google → browser redirected to /api/auth/google/callback
//   4. Callback: verify state, exchange code for tokens, auto-create spreadsheet
//   5. Redirect browser to frontend success/error page
import { Router } from 'express';
import { requireUser } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import {
  createDriveClient,
  createOAuth2Client,
  createSheetsClient,
  createState,
  getAuthorizationUrl,
  getRedirectUri,
  verifyState,
} from '../lib/google-oauth.js';
import { ensureSheetsInitialized } from '../lib/sheet-store.js';
import { invalidateUserSheetCache } from '../lib/user-sheet.js';

const router = Router();

function getFrontendUrl(): string {
  const replitDomain = process.env['REPLIT_DEV_DOMAIN'];
  if (replitDomain) return `https://${replitDomain}`;
  return process.env['FRONTEND_URL'] ?? 'http://localhost:5000';
}

// ─── GET /api/auth/google/initiate ──────────────────────────────────────────
// Returns the Google consent URL. The frontend redirects the user there.

router.get('/auth/google/initiate', requireUser, (req, res) => {
  try {
    const state = createState(req.userId!);
    const url = getAuthorizationUrl(state);
    req.log.info({ userId: req.userId, redirectUri: getRedirectUri() }, '[auth-google] Generated authorization URL');
    res.json({ data: { url } });
  } catch (err) {
    req.log.error({ err }, '[auth-google] Failed to generate auth URL');
    res.status(500).json({ error: 'Gagal membuat link autentikasi Google' });
  }
});

// ─── GET /api/auth/google/callback ──────────────────────────────────────────
// Google redirects the user here after consent. No Bearer token — userId
// comes from the signed state parameter.

router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const frontendUrl = getFrontendUrl();

  if (error || !code || !state) {
    req.log.warn({ error }, '[auth-google] OAuth denied or missing params');
    return res.redirect(`${frontendUrl}/connect-sheet?error=OAUTH_DENIED`);
  }

  const stateData = verifyState(state);
  if (!stateData) {
    req.log.warn('[auth-google] Invalid or expired OAuth state');
    return res.redirect(`${frontendUrl}/connect-sheet?error=OAUTH_STATE_INVALID`);
  }

  const { userId } = stateData;

  try {
    // Exchange the authorization code for tokens.
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      // No refresh_token — user likely already authorized previously. Check
      // if we already have one stored and the spreadsheet is set up.
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('google_refresh_token, spreadsheet_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.['google_refresh_token'] && profile?.['spreadsheet_id']) {
        // Already fully connected — treat as success.
        invalidateUserSheetCache(userId);
        return res.redirect(`${frontendUrl}/connect-sheet?connected=true`);
      }

      req.log.warn({ userId }, '[auth-google] No refresh_token in response — user must re-authorize');
      return res.redirect(`${frontendUrl}/connect-sheet?error=NO_REFRESH_TOKEN`);
    }

    const refreshToken = tokens.refresh_token;

    // Store the refresh token immediately — even if spreadsheet creation fails,
    // the user can retry without re-doing the OAuth consent.
    await supabaseAdmin
      .from('profiles')
      .update({ google_refresh_token: refreshToken })
      .eq('id', userId);

    // Auto-create a new Google Spreadsheet in the user's own Drive.
    const drive = createDriveClient(refreshToken);
    const driveRes = await drive.files.create({
      requestBody: {
        name: 'TemanNyatet — Data Pribadi',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
      fields: 'id',
    });

    const spreadsheetId = driveRes.data.id;
    if (!spreadsheetId) throw new Error('Drive API returned no spreadsheet ID');

    // Initialize all tabs and header rows.
    const sheets = createSheetsClient(refreshToken);
    await ensureSheetsInitialized(spreadsheetId, sheets);

    // Persist the spreadsheet ID.
    await supabaseAdmin
      .from('profiles')
      .update({ spreadsheet_id: spreadsheetId })
      .eq('id', userId);

    invalidateUserSheetCache(userId);

    req.log.info({ userId, spreadsheetId }, '[auth-google] OAuth connected, spreadsheet created');
    return res.redirect(`${frontendUrl}/connect-sheet?connected=true`);
  } catch (err) {
    req.log.error({ err, userId }, '[auth-google] OAuth callback failed');
    return res.redirect(`${frontendUrl}/connect-sheet?error=OAUTH_FAILED`);
  }
});

// ─── GET /api/auth/google/status ────────────────────────────────────────────

router.get('/auth/google/status', requireUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token, spreadsheet_id')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error) throw error;

    const hasToken = !!(profile?.['google_refresh_token']);
    const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;
    const connected = hasToken && !!spreadsheetId;

    res.json({
      data: {
        connected,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId
          ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          : null,
        // Expose the redirect URI so the user can verify it in Google Cloud Console
        redirectUri: getRedirectUri(),
      },
    });
  } catch (err) {
    req.log.error({ err }, '[auth-google] Failed to get status');
    res.status(500).json({ error: 'Gagal memuat status koneksi Google' });
  }
});

// ─── DELETE /api/auth/google/disconnect ─────────────────────────────────────

router.delete('/auth/google/disconnect', requireUser, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', req.userId!)
      .maybeSingle();

    const refreshToken = profile?.['google_refresh_token'] as string | null;
    if (refreshToken) {
      // Best-effort revocation — don't let revoke failure block disconnect.
      try {
        const client = createOAuth2Client();
        await client.revokeToken(refreshToken);
      } catch {
        req.log.warn({ userId: req.userId }, '[auth-google] Token revocation failed (ignored)');
      }
    }

    await supabaseAdmin
      .from('profiles')
      .update({ google_refresh_token: null, spreadsheet_id: null })
      .eq('id', req.userId!);

    invalidateUserSheetCache(req.userId!);
    res.json({ data: { disconnected: true } });
  } catch (err) {
    req.log.error({ err }, '[auth-google] Failed to disconnect');
    res.status(500).json({ error: 'Gagal memutus koneksi Google' });
  }
});

export default router;
