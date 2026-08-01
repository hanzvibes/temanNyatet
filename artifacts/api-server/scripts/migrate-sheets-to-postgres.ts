import { supabaseAdmin } from '../src/lib/supabase-admin.js';
import { createSheetsClient } from '../src/lib/google-oauth.js';
import { migrateSpreadsheet } from '../src/lib/sheet-to-postgres.js';

const userId = process.env.MIGRATION_USER_ID;
const spreadsheetId = process.env.MIGRATION_SPREADSHEET_ID;

if (!userId || !spreadsheetId) {
  throw new Error(
    'Set MIGRATION_USER_ID and MIGRATION_SPREADSHEET_ID. This import is non-destructive and never edits Google Sheets.',
  );
}

const { data: profile, error } = await supabaseAdmin
  .from('profiles')
  .select('google_refresh_token, spreadsheet_id')
  .eq('id', userId)
  .maybeSingle();

if (error) throw error;
if (profile?.spreadsheet_id !== spreadsheetId) {
  throw new Error('MIGRATION_SPREADSHEET_ID does not match the profile spreadsheet_id');
}
if (!profile.google_refresh_token) {
  throw new Error('The selected user has no Google refresh token');
}

const sheets = await createSheetsClient(profile.google_refresh_token);
const result = await migrateSpreadsheet({ userId, spreadsheetId, sheets });
console.log(JSON.stringify(result, null, 2));