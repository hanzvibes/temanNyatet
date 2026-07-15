/**
 * create-template.mjs
 *
 * Formats an existing blank Google Spreadsheet into the TemanNyatet
 * Master Template with full Material Design 3 styling.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  BEFORE RUNNING                                             │
 * │                                                             │
 * │  1. Buka https://sheets.google.com → buat spreadsheet baru │
 * │  2. Share ke service account sebagai Editor:                │
 * │     temannyatet@delta-album-469709-f9.iam.gserviceaccount.com
 * │  3. Salin spreadsheet ID dari URL:                          │
 * │     docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   node artifacts/api-server/scripts/create-template.mjs <SPREADSHEET_ID>
 */

import { google } from 'googleapis';
import crypto from 'crypto';

// ─── Validate args ────────────────────────────────────────────────────────────

const spreadsheetId = process.argv[2]?.trim();
if (!spreadsheetId) {
  console.error('');
  console.error('❌  Usage: node create-template.mjs <SPREADSHEET_ID>');
  console.error('');
  console.error('   Buat spreadsheet baru di Google Sheets, share ke service account,');
  console.error('   lalu jalankan script ini dengan ID spreadsheet-nya.');
  console.error('');
  console.error('   Service account email:');
  console.error('   temannyatet@delta-album-469709-f9.iam.gserviceaccount.com');
  process.exit(1);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!rawKey) { console.error('❌  GOOGLE_SERVICE_ACCOUNT_KEY is not set.'); process.exit(1); }

const creds = JSON.parse(rawKey);
const auth  = new google.auth.JWT({
  email:  creds.client_email,
  key:    creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// ─── MD3 Color helpers ────────────────────────────────────────────────────────

function hex(h) {
  return {
    red:   parseInt(h.slice(1,3), 16) / 255,
    green: parseInt(h.slice(3,5), 16) / 255,
    blue:  parseInt(h.slice(5,7), 16) / 255,
  };
}

const C = {
  white:          hex('#FFFFFF'),
  surface:        hex('#FFFBFE'),
  outline:        hex('#CAC4D0'),
  onSurface:      hex('#1C1B1F'),
  onSurfaceVar:   hex('#49454F'),
  // Per-sheet header + tab colors  (header bg, tab dot, container tint)
  notes:        { h: hex('#6750A4'), t: hex('#6750A4'), c: hex('#F6F0FF') },
  transactions: { h: hex('#006874'), t: hex('#006874'), c: hex('#F0FAFB') },
  todos:        { h: hex('#7D5260'), t: hex('#7D5260'), c: hex('#FFF0F3') },
  links:        { h: hex('#386A20'), t: hex('#386A20'), c: hex('#F3FBE9') },
  journal:      { h: hex('#984061'), t: hex('#984061'), c: hex('#FFF0F6') },
  archive:      { h: hex('#625B71'), t: hex('#625B71'), c: hex('#F4EFF4') },
  metadata:     { h: hex('#49454F'), t: hex('#79747E'), c: hex('#F4EFF4') },
};

// ─── Sheet definitions ────────────────────────────────────────────────────────

const SHEETS = [
  {
    name:    'Notes',
    color:   C.notes,
    headers: ['id','user_id','title','content','tags','created_at','updated_at'],
    widths:  [ 150,     150,    220,     350,    160,      160,         160],
    desc:    'Catatan teks bebas — dikelola otomatis oleh aplikasi.',
  },
  {
    name:    'Transactions',
    color:   C.transactions,
    headers: ['id','user_id','type','amount','category','source','note','date','created_at'],
    widths:  [ 150,     150,   100,    120,      140,      140,    200,   110,      160],
    desc:    'Catatan pemasukan & pengeluaran.',
  },
  {
    name:    'Todos',
    color:   C.todos,
    headers: ['id','user_id','title','description','due_date','due_time','is_done','created_at'],
    widths:  [ 150,     150,    220,       280,        110,       90,       90,        160],
    desc:    'Daftar to-do.',
  },
  {
    name:    'Links',
    color:   C.links,
    headers: ['id','user_id','title','url','note','created_at'],
    widths:  [ 150,     150,    180,   300,   220,      160],
    desc:    'Koleksi link tersimpan.',
  },
  {
    name:    'Journal',
    color:   C.journal,
    headers: ['id','user_id','content','mood','date','created_at'],
    widths:  [ 150,     150,     380,    120,   110,      160],
    desc:    'Jurnal harian (coming soon).',
  },
  {
    name:    '_Archive',
    color:   C.archive,
    headers: ['id','source_sheet','archived_at','user_id','row_data'],
    widths:  [ 150,       130,         160,        150,      450],
    desc:    'Baris yang dihapus disimpan di sini oleh sistem. Jangan ubah.',
  },
  {
    name:    '_Metadata',
    color:   C.metadata,
    headers: ['key','value'],
    widths:  [  220,   400],
    desc:    'Metadata sistem — jangan ubah.',
  },
];

// ─── Request builders ─────────────────────────────────────────────────────────

const req = {
  setSheetProps: (sid, tabColor, numCols) => ({
    updateSheetProperties: {
      properties: {
        sheetId: sid,
        tabColorStyle: { rgbColor: tabColor },
        gridProperties: { frozenRowCount: 1, rowCount: 1001, columnCount: numCols },
      },
      fields: 'tabColorStyle,gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount',
    },
  }),

  headerRow: (sid, numCols, bg) => ({
    repeatCell: {
      range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
      cell: {
        userEnteredFormat: {
          backgroundColor: bg,
          textFormat: { bold: true, foregroundColor: C.white, fontSize: 10 },
          horizontalAlignment: 'CENTER',
          verticalAlignment:   'MIDDLE',
          wrapStrategy:        'CLIP',
          padding: { top: 0, bottom: 0, left: 12, right: 12 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,padding)',
    },
  }),

  headerHeight: (sid) => ({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 44 },
      fields: 'pixelSize',
    },
  }),

  dataRowHeight: (sid) => ({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'ROWS', startIndex: 1, endIndex: 1001 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize',
    },
  }),

  colWidth: (sid, i, px) => ({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
      properties: { pixelSize: px },
      fields: 'pixelSize',
    },
  }),

  dataArea: (sid, numCols) => ({
    repeatCell: {
      range: { sheetId: sid, startRowIndex: 1, endRowIndex: 1001, startColumnIndex: 0, endColumnIndex: numCols },
      cell: {
        userEnteredFormat: {
          backgroundColor: C.surface,
          textFormat: { fontSize: 10, foregroundColor: C.onSurface },
          verticalAlignment: 'MIDDLE',
          wrapStrategy:      'WRAP',
          padding: { top: 0, bottom: 0, left: 12, right: 12 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy,padding)',
    },
  }),

  gridBorders: (sid, numCols) => ({
    updateBorders: {
      range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1001, startColumnIndex: 0, endColumnIndex: numCols },
      innerHorizontal: { style: 'SOLID', colorStyle: { rgbColor: C.outline }, width: 1 },
      innerVertical:   { style: 'SOLID', colorStyle: { rgbColor: C.outline }, width: 1 },
    },
  }),

  headerBottomBorder: (sid, numCols, headerColor) => ({
    updateBorders: {
      range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
      bottom: {
        style: 'SOLID_MEDIUM',
        colorStyle: { rgbColor: { red: headerColor.red * 0.6, green: headerColor.green * 0.6, blue: headerColor.blue * 0.6 } },
        width: 2,
      },
    },
  }),

  basicFilter: (sid, numCols) => ({
    setBasicFilter: {
      filter: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
      },
    },
  }),

  addSheet: (title, sid, index) => ({
    addSheet: {
      properties: { sheetId: sid, title, index },
    },
  }),

  renameSheet: (sid, title) => ({
    updateSheetProperties: {
      properties: { sheetId: sid, title },
      fields: 'title',
    },
  }),

  deleteSheet: (sid) => ({ deleteSheet: { sheetId: sid } }),
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('🎨  TemanNyatet Template Builder — Material Design 3');
  console.log('─'.repeat(55));
  console.log(`📊  Target spreadsheet: ${spreadsheetId}`);
  console.log('');

  // 1. Read existing sheets so we can remove/rename them
  console.log('📋  Reading spreadsheet structure…');
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets ?? [];
  console.log(`    Found ${existing.length} existing sheet(s)`);

  // ── Assign IDs ────────────────────────────────────────────────
  // We use high IDs (1100–1700) to avoid collisions with Google's
  // auto-assigned IDs (usually 0, then random).
  const ID_BASE = 1100;
  SHEETS.forEach((s, i) => { s.id = ID_BASE + i * 100; });

  const existingIds = existing.map(s => s.properties.sheetId);

  // ── Build batchUpdate requests ────────────────────────────────
  const setupRequests = [];

  // Add all our sheets (addSheet)
  SHEETS.forEach((s, i) => {
    setupRequests.push(req.addSheet(s.name, s.id, i));
  });

  // Delete every original sheet
  for (const s of existing) {
    setupRequests.push(req.deleteSheet(s.properties.sheetId));
  }

  console.log('🔧  Creating template sheets…');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: setupRequests },
  });
  console.log('    Sheets created, originals removed');

  // 2. Apply MD3 formatting
  console.log('🎨  Applying Material Design 3 styles…');
  const fmtRequests = [];

  for (const s of SHEETS) {
    const sid = s.id;
    const n   = s.headers.length;
    fmtRequests.push(
      req.setSheetProps(sid, s.color.t, n),
      req.headerRow(sid, n, s.color.h),
      req.headerHeight(sid),
      req.dataRowHeight(sid),
      req.dataArea(sid, n),
      req.gridBorders(sid, n),
      req.headerBottomBorder(sid, n, s.color.h),
      req.basicFilter(sid, n),
      ...s.widths.map((w, i) => req.colWidth(sid, i, w)),
    );
  }

  // Extra styling on _Metadata key column (bold, tinted)
  const metaId = SHEETS.find(s => s.name === '_Metadata').id;
  fmtRequests.push(
    {
      repeatCell: {
        range: { sheetId: metaId, startRowIndex: 1, endRowIndex: 20, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: C.onSurfaceVar, fontSize: 10 },
            backgroundColor: hex('#F4EFF4'),
            padding: { top: 0, bottom: 0, left: 12, right: 12 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor,padding)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: metaId, startRowIndex: 1, endRowIndex: 20, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { foregroundColor: C.onSurface, fontSize: 10 },
            backgroundColor: C.surface,
            padding: { top: 0, bottom: 0, left: 12, right: 12 },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor,padding,wrapStrategy)',
      },
    },
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: fmtRequests },
  });
  console.log('    Formatting done');

  // 3. Write header values + metadata content
  console.log('📝  Writing headers and metadata…');
  const TEMPLATE_ID = crypto.randomUUID();
  const now         = new Date().toISOString();

  const valueRanges = SHEETS.map(s => ({
    range:  `${s.name}!A1`,
    values: [s.headers],
  }));

  valueRanges.push({
    range:  '_Metadata!A2',
    values: [
      ['template_id',      TEMPLATE_ID],
      ['template_version', '1.0.0'],
      ['template_name',    'TemanNyatet'],
      ['created_at',       now],
      ['description',      'Template resmi TemanNyatet. Salin file ini (File → Buat salinan), lalu hubungkan ke aplikasi.'],
    ],
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: valueRanges },
  });
  console.log('    Headers and metadata written');

  // 4. Rename spreadsheet title
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateSpreadsheetProperties: {
          properties: { title: '🗒️ TemanNyatet — Template' },
          fields: 'title',
        },
      }],
    },
  });

  // ─── Output ───────────────────────────────────────────────────
  const url     = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const copyUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy`;

  console.log('');
  console.log('─'.repeat(55));
  console.log('🎉  Template selesai!\n');
  console.log(`📊  Spreadsheet URL:\n    ${url}\n`);
  console.log(`🔗  Copy URL (untuk tombol onboarding):\n    ${copyUrl}\n`);
  console.log('─'.repeat(55));
  console.log('');
  console.log('📋  Simpan di Replit Secrets (Settings → Secrets):\n');
  console.log(`    Key:   SPREADSHEET_TEMPLATE_ID`);
  console.log(`    Value: ${TEMPLATE_ID}\n`);
  console.log(`    Key:   VITE_SPREADSHEET_TEMPLATE_ID`);
  console.log(`    Value: ${spreadsheetId}\n`);
  console.log('─'.repeat(55));
  console.log('');
  console.log('📌  Langkah terakhir (manual):');
  console.log('');
  console.log('    1. Buka URL spreadsheet di atas');
  console.log('    2. File → Share → General access → Anyone with the link → Viewer');
  console.log('       (agar tombol "Salin Template" bisa dipakai user)');
  console.log('');
  console.log('    3. Jalankan migrasi 003 di Supabase SQL Editor:');
  console.log('       supabase/migrations/003_template_tracking.sql');
  console.log('');
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
