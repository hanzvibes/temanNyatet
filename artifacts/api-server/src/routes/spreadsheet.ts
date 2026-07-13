import { Router } from 'express';
import { requireUser } from '../middleware/requireAuth';
import { supabaseAdmin } from '../lib/supabase-admin';
import {
  getServiceAccountEmail,
  getSheets,
  getSheetsConfigError,
  isSheetsConfigured,
} from '../lib/google-sheets';
import { ensureSheetsInitialized } from '../lib/sheet-store';
import { invalidateUserSheetCache } from '../lib/user-sheet';

const router = Router();

function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

// Accepts either a full Google Sheets URL or a bare spreadsheet ID and
// returns the extracted ID, or null if the input doesn't look like either.
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1] ?? null;
  if (/^[a-zA-Z0-9-_]{15,80}$/.test(trimmed)) return trimmed;
  return null;
}

// GET /api/spreadsheet/status
router.get('/spreadsheet/status', requireUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('spreadsheet_id')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error) throw error;

    const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;
    res.status(200).json({
      data: {
        connected: !!spreadsheetId,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId ? spreadsheetUrl(spreadsheetId) : null,
        serviceAccountEmail: getServiceAccountEmail(),
        sheetsConfigured: isSheetsConfigured(),
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to load spreadsheet status');
    res.status(500).json({ error: 'Gagal memuat status spreadsheet' });
  }
});

// POST /api/spreadsheet/connect  { input: string }
// `input` may be a full Google Sheets URL or a bare spreadsheet ID.
router.post('/spreadsheet/connect', requireUser, async (req, res) => {
  try {
    if (!isSheetsConfigured()) {
      res.status(503).json({ error: getSheetsConfigError() ?? 'Google Sheets belum dikonfigurasi di server.' });
      return;
    }

    const input = typeof req.body?.input === 'string' ? req.body.input : '';
    const spreadsheetId = extractSpreadsheetId(input);
    if (!spreadsheetId) {
      res.status(400).json({ error: 'Link atau ID spreadsheet tidak valid.' });
      return;
    }

    // Reject if this spreadsheet is already connected to a different account.
    const { data: existingOwner, error: ownerLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('spreadsheet_id', spreadsheetId)
      .maybeSingle();
    if (ownerLookupError) throw ownerLookupError;
    if (existingOwner && existingOwner.id !== req.userId) {
      res.status(409).json({ error: 'Spreadsheet ini sudah terhubung ke akun lain.' });
      return;
    }

    // Verify the service account can actually reach it before saving anything.
    const sheets = getSheets();
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
    } catch (err) {
      req.log.warn({ err, spreadsheetId }, 'Spreadsheet not accessible to service account');
      res.status(400).json({
        error: `Spreadsheet tidak bisa diakses. Pastikan sudah kamu share sebagai Editor ke ${getServiceAccountEmail() ?? 'email service account'}.`,
      });
      return;
    }

    await ensureSheetsInitialized(spreadsheetId);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ spreadsheet_id: spreadsheetId })
      .eq('id', req.userId!);
    if (updateError) throw updateError;

    invalidateUserSheetCache(req.userId!);

    res.status(200).json({
      data: {
        connected: true,
        spreadsheetId,
        spreadsheetUrl: spreadsheetUrl(spreadsheetId),
        serviceAccountEmail: getServiceAccountEmail(),
        sheetsConfigured: true,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to connect spreadsheet');
    res.status(500).json({ error: 'Gagal menghubungkan spreadsheet' });
  }
});

export default router;
