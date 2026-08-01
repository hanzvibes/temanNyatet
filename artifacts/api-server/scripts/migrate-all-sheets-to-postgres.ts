import { supabaseAdmin } from '../src/lib/supabase-admin.js';
import { createSheetsClient } from '../src/lib/google-oauth.js';
import { migrateSpreadsheet } from '../src/lib/sheet-to-postgres.js';

const { data: profiles, error } = await supabaseAdmin
  .from('profiles')
  .select('id, google_refresh_token, spreadsheet_id')
  .not('spreadsheet_id', 'is', null)
  .not('google_refresh_token', 'is', null);

if (error) throw error;

const summary: Array<{
  userId: string;
  spreadsheetIdSuffix: string;
  status: 'succeeded' | 'failed';
  imported?: number;
  skipped?: number;
  invalid?: number;
  error?: string;
}> = [];

for (const profile of profiles ?? []) {
  const userId = String(profile.id);
  const spreadsheetId = String(profile.spreadsheet_id);
  try {
    const sheets = await createSheetsClient(String(profile.google_refresh_token));
    const result = await migrateSpreadsheet({ userId, spreadsheetId, sheets });
    summary.push({
      userId,
      spreadsheetIdSuffix: spreadsheetId.slice(-6),
      status: 'succeeded',
      imported: result.imported,
      skipped: result.skipped,
      invalid: result.invalid,
    });
  } catch (migrationError) {
    summary.push({
      userId,
      spreadsheetIdSuffix: spreadsheetId.slice(-6),
      status: 'failed',
      error: migrationError instanceof Error ? migrationError.message : 'Unknown migration error',
    });
  }
}

console.log(JSON.stringify({
  totalUsers: profiles?.length ?? 0,
  succeeded: summary.filter((item) => item.status === 'succeeded').length,
  failed: summary.filter((item) => item.status === 'failed').length,
  summary,
}, null, 2));

if (summary.some((item) => item.status === 'failed')) process.exitCode = 2;