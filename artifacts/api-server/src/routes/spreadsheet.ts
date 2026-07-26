// Spreadsheet management routes (status + repair + validate).
// The connect flow is now handled by OAuth in routes/auth-google.ts.
import { Router } from 'express';
import { requireAuth, requireUser, userRateLimit } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { SheetsAccessError } from '../lib/google-sheets.js';
import { repairHeaders, SHEET_SCHEMAS } from '../lib/sheet-store.js';
import { invalidateUserSheetCache } from '../lib/user-sheet.js';

const router = Router();

// ─── GET /api/spreadsheet/status ────────────────────────────────────────────
// Returns connection state for the current user. Uses requireUser (not
// requireAuth) so this can be polled even before Google is connected.

router.get('/spreadsheet/status', requireUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token, spreadsheet_id')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error) throw error;

    const hasToken = !!(profile?.['google_refresh_token']);
    const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;

    res.status(200).json({
      data: {
        connected: hasToken && !!spreadsheetId,
        googleConnected: hasToken,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId
          ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          : null,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to load spreadsheet status');
    res.status(500).json({ error: 'Gagal memuat status spreadsheet' });
  }
});

// ─── POST /api/spreadsheet/repair ───────────────────────────────────────────
// Re-writes correct header rows to all sheet tabs without touching data rows.
// Use when a user has accidentally renamed or deleted header columns.

router.post('/spreadsheet/repair', requireAuth, userRateLimit, async (req, res) => {
  try {
    const result = await repairHeaders(req.spreadsheetId!, req.sheetsClient!);
    invalidateUserSheetCache(req.userId!);
    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to repair spreadsheet');
    res.status(500).json({ error: 'Gagal memperbaiki spreadsheet' });
  }
});

// ─── POST /api/spreadsheet/validate ─────────────────────────────────────────
// Checks that the connected spreadsheet has the required tabs and header rows.
// Returns a structured report so the frontend can show a "spreadsheet healthy"
// indicator or prompt the user to repair.

router.post('/spreadsheet/validate', requireAuth, userRateLimit, async (req, res) => {
  try {
    const spreadsheetId = req.spreadsheetId!;
    const sheets = req.sheetsClient!;

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = new Map(
      (meta.data.sheets ?? []).map((s) => [s.properties?.title, s.properties?.sheetId]),
    );

    const requiredSheets = Object.keys(SHEET_SCHEMAS);
    const missingSheets = requiredSheets.filter((title) => !existingSheets.has(title));

    const headerMismatches: { sheet: string; expected: string[]; actual: string[] }[] = [];
    for (const [title, expectedHeaders] of Object.entries(SHEET_SCHEMAS)) {
      if (!existingSheets.has(title)) continue;
      const range = `'${title}'!A1:${String.fromCharCode(64 + expectedHeaders.length)}1`;
      const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      const actual = (headerRes.data.values?.[0] ?? []) as string[];
      if (expectedHeaders.some((h, i) => actual[i] !== h)) {
        headerMismatches.push({ sheet: title, expected: expectedHeaders, actual });
      }
    }

    const valid = missingSheets.length === 0 && headerMismatches.length === 0;

    res.status(200).json({
      data: {
        valid,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        missingSheets,
        headerMismatches,
      },
    });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to validate spreadsheet');
    res.status(500).json({ error: 'Gagal memvalidasi spreadsheet' });
  }
});

export default router;
