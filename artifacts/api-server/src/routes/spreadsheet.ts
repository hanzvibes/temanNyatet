// Spreadsheet management routes (status + repair).
// The connect flow is now handled by OAuth in routes/auth-google.ts.
import { Router } from 'express';
import { requireAuth, requireUser } from '../middleware/requireAuth';
import { supabaseAdmin } from '../lib/supabase-admin';
import { SheetsAccessError } from '../lib/google-sheets';
import { repairHeaders } from '../lib/sheet-store';
import { invalidateUserSheetCache } from '../lib/user-sheet';

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

router.post('/spreadsheet/repair', requireAuth, async (req, res) => {
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

export default router;
