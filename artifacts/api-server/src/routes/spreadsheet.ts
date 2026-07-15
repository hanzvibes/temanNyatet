import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireUser } from '../middleware/requireAuth';
import { supabaseAdmin } from '../lib/supabase-admin';
import {
  getServiceAccountEmail,
  getSheets,
  getSheetsConfigError,
  isSheetsConfigured,
  SheetsAccessError,
  withGoogleRetry,
} from '../lib/google-sheets';
import { ensureSheetsInitialized, repairHeaders } from '../lib/sheet-store';
import { invalidateUserSheetCache } from '../lib/user-sheet';

const router = Router();

// This endpoint makes outbound calls to Google and does a Supabase ownership
// lookup per attempt — tighten the rate limit beyond the global 300/15min.
const connectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

// Accepts either a full Google Sheets URL or a bare spreadsheet ID.
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1] ?? null;
  if (/^[a-zA-Z0-9-_]{15,80}$/.test(trimmed)) return trimmed;
  return null;
}

// Reads the _Metadata tab to get the template_id and template_version that
// the developer put there when creating the master template spreadsheet.
// Returns null values if the tab is missing or unreadable (treated as
// "not a valid template copy" when SPREADSHEET_TEMPLATE_ID is configured).
async function readTemplateMetadata(
  spreadsheetId: string,
): Promise<{ templateId: string | null; templateVersion: string | null }> {
  try {
    const sheets = getSheets();
    const res = await withGoogleRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '_Metadata!A1:B10',
      }),
    );
    const values = res.data.values ?? [];
    const map: Record<string, string> = {};
    for (const row of values) {
      if (row[0] && row[1]) map[String(row[0])] = String(row[1]);
    }
    return {
      templateId: map['template_id'] ?? null,
      templateVersion: map['template_version'] ?? null,
    };
  } catch {
    // _Metadata tab missing or unreadable — not a valid template copy
    return { templateId: null, templateVersion: null };
  }
}

// ─── GET /api/spreadsheet/status ────────────────────────────────────────────

router.get('/spreadsheet/status', requireUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('spreadsheet_id')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error) throw error;

    const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;

    // Fetch template version if connected (best-effort, don't block status)
    let templateVersion: string | null = null;
    if (spreadsheetId && isSheetsConfigured()) {
      const meta = await readTemplateMetadata(spreadsheetId);
      templateVersion = meta.templateVersion;
    }

    res.status(200).json({
      data: {
        connected: !!spreadsheetId,
        spreadsheetId,
        spreadsheetUrl: spreadsheetId ? spreadsheetUrl(spreadsheetId) : null,
        serviceAccountEmail: getServiceAccountEmail(),
        sheetsConfigured: isSheetsConfigured(),
        templateVersion,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to load spreadsheet status');
    res.status(500).json({ error: 'Gagal memuat status spreadsheet' });
  }
});

// ─── POST /api/spreadsheet/connect ──────────────────────────────────────────
// `input` may be a full Google Sheets URL or a bare spreadsheet ID.

router.post('/spreadsheet/connect', requireUser, connectLimiter, async (req, res) => {
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

    // Verify the service account can actually reach the spreadsheet.
    const sheets = getSheets();
    try {
      await withGoogleRetry(() => sheets.spreadsheets.get({ spreadsheetId }));
    } catch (err) {
      if (err instanceof SheetsAccessError) {
        if (err.code === 'SPREADSHEET_ACCESS_DENIED') {
          res.status(400).json({
            error: `Spreadsheet tidak bisa diakses. Pastikan sudah kamu share sebagai Editor ke ${getServiceAccountEmail() ?? 'email service account'}.`,
          });
        } else {
          res.status(400).json({ error: 'Spreadsheet tidak ditemukan. Periksa kembali link yang kamu masukkan.' });
        }
        return;
      }
      req.log.warn({ err, spreadsheetId }, 'Spreadsheet not accessible to service account');
      res.status(400).json({
        error: `Spreadsheet tidak bisa diakses. Pastikan sudah kamu share sebagai Editor ke ${getServiceAccountEmail() ?? 'email service account'}.`,
      });
      return;
    }

    // Validate that this spreadsheet is a copy of the official template.
    // Skipped when SPREADSHEET_TEMPLATE_ID is not set (development/testing).
    const TEMPLATE_ID = process.env['SPREADSHEET_TEMPLATE_ID'];
    if (TEMPLATE_ID) {
      const { templateId } = await readTemplateMetadata(spreadsheetId);
      if (templateId !== TEMPLATE_ID) {
        res.status(400).json({
          error:
            'Spreadsheet ini bukan salinan dari template resmi TemanNyatet. Gunakan tombol "Salin Template" di halaman onboarding untuk membuat salinan yang benar.',
        });
        return;
      }
    }

    await ensureSheetsInitialized(spreadsheetId);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ spreadsheet_id: spreadsheetId })
      .eq('id', req.userId!);
    if (updateError) throw updateError;

    invalidateUserSheetCache(req.userId!);

    // Fetch template version for the response
    const { templateVersion } = await readTemplateMetadata(spreadsheetId);

    res.status(200).json({
      data: {
        connected: true,
        spreadsheetId,
        spreadsheetUrl: spreadsheetUrl(spreadsheetId),
        serviceAccountEmail: getServiceAccountEmail(),
        sheetsConfigured: true,
        templateVersion,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Failed to connect spreadsheet');
    res.status(500).json({ error: 'Gagal menghubungkan spreadsheet' });
  }
});

// ─── POST /api/spreadsheet/repair ───────────────────────────────────────────
// Re-writes correct header rows to all sheet tabs without touching data rows.
// Use when a user has accidentally renamed or deleted header columns.

router.post('/spreadsheet/repair', requireUser, async (req, res) => {
  try {
    if (!isSheetsConfigured()) {
      res.status(503).json({ error: 'Google Sheets belum dikonfigurasi di server.' });
      return;
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('spreadsheet_id')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error) throw error;

    const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;
    if (!spreadsheetId) {
      res.status(428).json({ error: 'Belum ada spreadsheet yang terhubung.' });
      return;
    }

    const result = await repairHeaders(spreadsheetId);
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
