/**
 * TemanNyatet — Master Google Spreadsheet Template Setup
 *
 * Runs against SPREADSHEET_TEMPLATE_ID to build all 10 sheets with
 * professional Material Design 3 styling, frozen headers, filters,
 * data validation, conditional formatting, and metadata.
 *
 * Usage:
 *   cd artifacts/api-server && node scripts/setup-template.mjs
 */

import { google } from 'googleapis';

// ─── Guard env vars ──────────────────────────────────────────────────────────

const RAW_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const SPREADSHEET_ID = process.env.SPREADSHEET_TEMPLATE_ID;

if (!RAW_KEY) { console.error('❌  GOOGLE_SERVICE_ACCOUNT_KEY is not set'); process.exit(1); }
if (!SPREADSHEET_ID) { console.error('❌  SPREADSHEET_TEMPLATE_ID is not set'); process.exit(1); }

const credentials = JSON.parse(RAW_KEY);
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key:   credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const api = google.sheets({ version: 'v4', auth });

// ─── Palette (Material Design 3 / Linear / Notion hybrid) ───────────────────

const C = {
  // Primary brand
  brand:        { red: 0.098, green: 0.451, blue: 0.914 },  // #1874EA
  brandDark:    { red: 0.067, green: 0.302, blue: 0.682 },  // #114DAE
  brandLight:   { red: 0.898, green: 0.929, blue: 0.996 },  // #E6EDFE

  // Semantic
  green:        { red: 0.161, green: 0.682, blue: 0.322 },  // #29AE52
  greenLight:   { red: 0.878, green: 0.969, blue: 0.902 },  // #E0F7E6
  orange:       { red: 0.984, green: 0.671, blue: 0.000 },  // #FBAB00
  orangeLight:  { red: 0.996, green: 0.949, blue: 0.863 },  // #FEF2DC
  red:          { red: 0.898, green: 0.224, blue: 0.208 },  // #E53935
  redLight:     { red: 0.996, green: 0.898, blue: 0.894 },  // #FEE5E4
  purple:       { red: 0.569, green: 0.220, blue: 0.902 },  // #9138E6
  purpleLight:  { red: 0.941, green: 0.894, blue: 0.996 },  // #F0E4FE
  teal:         { red: 0.000, green: 0.737, blue: 0.831 },  // #00BCD4
  tealLight:    { red: 0.878, green: 0.969, blue: 0.973 },  // #E0F7F8
  amber:        { red: 0.976, green: 0.671, blue: 0.000 },  // #F9AB00
  amberLight:   { red: 0.996, green: 0.957, blue: 0.867 },  // #FEF4DD
  pink:         { red: 0.961, green: 0.141, blue: 0.573 },  // #F52492
  pinkLight:    { red: 0.996, green: 0.878, blue: 0.957 },  // #FEE0F4

  // Neutrals
  white:        { red: 1.000, green: 1.000, blue: 1.000 },
  bgAlt:        { red: 0.969, green: 0.976, blue: 1.000 },  // #F7F9FF subtle blue tint
  surfaceGray:  { red: 0.973, green: 0.973, blue: 0.980 },  // #F8F8FA
  borderLight:  { red: 0.886, green: 0.898, blue: 0.929 },  // #E2E5ED
  textDark:     { red: 0.129, green: 0.149, blue: 0.196 },  // #212632
  textMid:      { red: 0.373, green: 0.408, blue: 0.486 },  // #5F687C
  textLight:    { red: 0.647, green: 0.678, blue: 0.745 },  // #A5ADBE
  darkBg:       { red: 0.098, green: 0.122, blue: 0.176 },  // #191F2D
};

// ─── Sheet definitions ────────────────────────────────────────────────────────

const SHEETS = [
  { name: '🏠 Dashboard',     tabColor: C.green,  index: 0 },
  { name: '📝 Notes',         tabColor: C.brand,  index: 1 },
  { name: '✅ Todos',         tabColor: C.amber,  index: 2 },
  { name: '💰 Transactions',  tabColor: C.pink,   index: 3 },
  { name: '🔗 Links',         tabColor: C.purple, index: 4 },
  { name: '📅 Calendar',      tabColor: C.teal,   index: 5 },
  { name: '📊 Analytics',     tabColor: C.orange, index: 6 },
  { name: '⚙️ Settings',      tabColor: C.textMid, index: 7 },
  { name: '📦 _Archive',      tabColor: C.textLight, index: 8 },
  { name: '🔒 _Metadata',     tabColor: C.darkBg, index: 9 },
];

// ─── Column definitions (human-friendly — matches user-facing template) ──────

const COLUMNS = {
  '📝 Notes': [
    { label: 'ID',         width: 220, hidden: true  },
    { label: 'User ID',    width: 220, hidden: true  },
    { label: 'Title',      width: 280, hidden: false },
    { label: 'Category',   width: 150, hidden: false },
    { label: 'Content',    width: 420, hidden: false },
    { label: 'Tags',       width: 200, hidden: false },
    { label: 'Favorite',   width: 90,  hidden: false },
    { label: 'Created At', width: 180, hidden: false },
    { label: 'Updated At', width: 180, hidden: false },
  ],
  '✅ Todos': [
    { label: 'ID',         width: 220, hidden: true  },
    { label: 'User ID',    width: 220, hidden: true  },
    { label: 'Task',       width: 320, hidden: false },
    { label: 'Priority',   width: 110, hidden: false },
    { label: 'Status',     width: 110, hidden: false },
    { label: 'Due Date',   width: 150, hidden: false },
    { label: 'Reminder',   width: 150, hidden: false },
    { label: 'Created At', width: 180, hidden: false },
    { label: 'Updated At', width: 180, hidden: false },
  ],
  '💰 Transactions': [
    { label: 'ID',             width: 220, hidden: true  },
    { label: 'User ID',        width: 220, hidden: true  },
    { label: 'Date',           width: 130, hidden: false },
    { label: 'Type',           width: 110, hidden: false },
    { label: 'Category',       width: 160, hidden: false },
    { label: 'Amount',         width: 140, hidden: false },
    { label: 'Description',    width: 300, hidden: false },
    { label: 'Payment Method', width: 160, hidden: false },
    { label: 'Created At',     width: 180, hidden: false },
  ],
  '🔗 Links': [
    { label: 'ID',         width: 220, hidden: true  },
    { label: 'User ID',    width: 220, hidden: true  },
    { label: 'Title',      width: 280, hidden: false },
    { label: 'URL',        width: 380, hidden: false },
    { label: 'Category',   width: 150, hidden: false },
    { label: 'Tags',       width: 200, hidden: false },
    { label: 'Created At', width: 180, hidden: false },
  ],
  '📅 Calendar': [
    { label: 'Date',      width: 140, hidden: false },
    { label: 'Event',     width: 320, hidden: false },
    { label: 'Reminder',  width: 160, hidden: false },
    { label: 'Status',    width: 130, hidden: false },
  ],
  '📦 _Archive': [
    { label: 'ID',           width: 220, hidden: false },
    { label: 'Source Sheet', width: 160, hidden: false },
    { label: 'Archived At',  width: 180, hidden: false },
    { label: 'User ID',      width: 220, hidden: true  },
    { label: 'Row Data',     width: 560, hidden: false },
  ],
};

// ─── Helper: RGB shorthand ────────────────────────────────────────────────────

function rgb(c) { return { red: c.red, green: c.green, blue: c.blue }; }

// ─── Helper: Grid range ───────────────────────────────────────────────────────

function range(sheetId, r1, c1, r2, c2) {
  return {
    sheetId,
    startRowIndex: r1,
    endRowIndex:   r2 ?? undefined,
    startColumnIndex: c1,
    endColumnIndex:   c2 ?? undefined,
  };
}

// ─── Header cell format ────────────────────────────────────────────────────────

function headerCellFormat(bgColor, textColor = C.white) {
  return {
    backgroundColor: rgb(bgColor),
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE',
    textFormat: {
      foregroundColor: rgb(textColor),
      bold: true,
      fontSize: 10,
      fontFamily: 'Google Sans',
    },
    padding: { top: 8, bottom: 8, left: 10, right: 10 },
    wrapStrategy: 'CLIP',
  };
}

// ─── Regular cell format ──────────────────────────────────────────────────────

function dataCellFormat() {
  return {
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE',
    textFormat: {
      foregroundColor: rgb(C.textDark),
      fontSize: 10,
      fontFamily: 'Google Sans',
    },
    padding: { top: 6, bottom: 6, left: 10, right: 10 },
    wrapStrategy: 'CLIP',
  };
}

// ─── Build batch requests ─────────────────────────────────────────────────────

function buildSheetRequests(sheetId, sheetName, headerBg) {
  const cols = COLUMNS[sheetName];
  if (!cols) return [];

  const numCols = cols.length;
  const requests = [];

  // 1. Freeze row 1
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 2. Set row 1 height to 40px (breathing room for header)
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  // 3. Set default data row height to 28px
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 1 },
      properties: { pixelSize: 28 },
      fields: 'pixelSize',
    },
  });

  // 4. Apply header formatting to row 1
  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, numCols),
      cell: { userEnteredFormat: headerCellFormat(headerBg) },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  // 5. Apply data cell formatting to rows 2–1000
  requests.push({
    repeatCell: {
      range: range(sheetId, 1, 0, 1000, numCols),
      cell: { userEnteredFormat: dataCellFormat() },
      fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  // 6. Alternating row banding
  requests.push({
    addBanding: {
      bandedRange: {
        range: range(sheetId, 1, 0, 1000, numCols),
        rowProperties: {
          headerColor:          rgb(headerBg),
          firstBandColor:       rgb(C.white),
          secondBandColor:      rgb(C.bgAlt),
        },
      },
    },
  });

  // 7. Header row border (bottom only — clean look)
  requests.push({
    updateBorders: {
      range: range(sheetId, 0, 0, 1, numCols),
      bottom: {
        style: 'SOLID_MEDIUM',
        color: rgb(headerBg),
      },
    },
  });

  // 8. Set column widths + hide if needed
  cols.forEach((col, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: col.width, hiddenByUser: col.hidden },
        fields: col.hidden ? 'pixelSize,hiddenByUser' : 'pixelSize',
      },
    });
  });

  // 9. Basic filter on row 1
  requests.push({
    setBasicFilter: {
      filter: { range: range(sheetId, 0, 0, 1, numCols) },
    },
  });

  return requests;
}

// ─── Data validation requests ─────────────────────────────────────────────────

function buildValidationRequests(sheetMap) {
  const requests = [];

  // ── Todos: Priority (col 3 = D, index 3) ──
  const todosId = sheetMap['✅ Todos'];
  if (todosId !== undefined) {
    requests.push({
      setDataValidation: {
        range: range(todosId, 1, 3, 1000, 4),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Low' },
              { userEnteredValue: 'Medium' },
              { userEnteredValue: 'High' },
            ],
          },
          showCustomUi: true,
          strict: true,
        },
      },
    });

    // ── Todos: Status (col 4 = E, index 4) ──
    requests.push({
      setDataValidation: {
        range: range(todosId, 1, 4, 1000, 5),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Todo' },
              { userEnteredValue: 'Progress' },
              { userEnteredValue: 'Done' },
            ],
          },
          showCustomUi: true,
          strict: true,
        },
      },
    });

    // ── Todos: Favorite checkbox (col 6 = G, index 6) for Notes is index 6
    // For Todos: Due Date col 5, Reminder col 6 — no checkbox here
  }

  // ── Notes: Favorite (col 6 = G, index 6) — checkbox ──
  const notesId = sheetMap['📝 Notes'];
  if (notesId !== undefined) {
    requests.push({
      setDataValidation: {
        range: range(notesId, 1, 6, 1000, 7),
        rule: {
          condition: { type: 'BOOLEAN' },
          showCustomUi: true,
        },
      },
    });
  }

  // ── Transactions: Type (col 3 = D, index 3) ──
  const txId = sheetMap['💰 Transactions'];
  if (txId !== undefined) {
    requests.push({
      setDataValidation: {
        range: range(txId, 1, 3, 1000, 4),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Income' },
              { userEnteredValue: 'Expense' },
            ],
          },
          showCustomUi: true,
          strict: true,
        },
      },
    });

    // ── Transactions: Payment Method (col 7 = H, index 7) ──
    requests.push({
      setDataValidation: {
        range: range(txId, 1, 7, 1000, 8),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Cash' },
              { userEnteredValue: 'Transfer' },
              { userEnteredValue: 'Credit Card' },
              { userEnteredValue: 'Debit Card' },
              { userEnteredValue: 'E-Wallet' },
              { userEnteredValue: 'QRIS' },
              { userEnteredValue: 'Other' },
            ],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    });
  }

  // ── Calendar: Status (col 3 = D, index 3) ──
  const calId = sheetMap['📅 Calendar'];
  if (calId !== undefined) {
    requests.push({
      setDataValidation: {
        range: range(calId, 1, 3, 1000, 4),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Upcoming' },
              { userEnteredValue: 'Done' },
              { userEnteredValue: 'Cancelled' },
            ],
          },
          showCustomUi: true,
          strict: true,
        },
      },
    });
  }

  return requests;
}

// ─── Conditional formatting ────────────────────────────────────────────────────

function buildConditionalFormatRequests(sheetMap) {
  const requests = [];

  // ── Todos: Priority colors (col D = index 3) ──
  const todosId = sheetMap['✅ Todos'];
  if (todosId !== undefined) {
    const priorityRules = [
      { value: 'High',   bg: C.redLight,    fg: C.red    },
      { value: 'Medium', bg: C.orangeLight, fg: C.orange },
      { value: 'Low',    bg: C.greenLight,  fg: C.green  },
    ];
    for (const rule of priorityRules) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range(todosId, 1, 3, 1000, 4)],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: rule.value }] },
              format: {
                backgroundColor: rgb(rule.bg),
                textFormat: { foregroundColor: rgb(rule.fg), bold: true },
              },
            },
          },
          index: 0,
        },
      });
    }

    // ── Todos: Status colors (col E = index 4) ──
    const statusRules = [
      { value: 'Done',     bg: C.greenLight,  fg: C.green  },
      { value: 'Progress', bg: C.brandLight,  fg: C.brand  },
      { value: 'Todo',     bg: C.surfaceGray, fg: C.textMid },
    ];
    for (const rule of statusRules) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range(todosId, 1, 4, 1000, 5)],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: rule.value }] },
              format: {
                backgroundColor: rgb(rule.bg),
                textFormat: { foregroundColor: rgb(rule.fg), bold: true },
              },
            },
          },
          index: 0,
        },
      });
    }

    // ── Todos: Entire done row — strikethrough text ──
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range(todosId, 1, 2, 1000, 9)],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$E2="Done"' }],
            },
            format: {
              textFormat: { strikethrough: true, foregroundColor: rgb(C.textLight) },
            },
          },
        },
        index: 0,
      },
    });
  }

  // ── Transactions: Type colors (col D = index 3) ──
  const txId = sheetMap['💰 Transactions'];
  if (txId !== undefined) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range(txId, 1, 3, 1000, 4)],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Income' }] },
            format: {
              backgroundColor: rgb(C.greenLight),
              textFormat: { foregroundColor: rgb(C.green), bold: true },
            },
          },
        },
        index: 0,
      },
    });
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range(txId, 1, 3, 1000, 4)],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Expense' }] },
            format: {
              backgroundColor: rgb(C.redLight),
              textFormat: { foregroundColor: rgb(C.red), bold: true },
            },
          },
        },
        index: 0,
      },
    });

    // ── Transactions: Amount green for Income, red for Expense (col F = index 5) ──
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range(txId, 1, 5, 1000, 6)],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$D2="Income"' }],
            },
            format: {
              textFormat: { foregroundColor: rgb(C.green), bold: true },
            },
          },
        },
        index: 0,
      },
    });
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range(txId, 1, 5, 1000, 6)],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$D2="Expense"' }],
            },
            format: {
              textFormat: { foregroundColor: rgb(C.red), bold: true },
            },
          },
        },
        index: 0,
      },
    });
  }

  // ── Calendar: Status colors (col D = index 3) ──
  const calId = sheetMap['📅 Calendar'];
  if (calId !== undefined) {
    const calRules = [
      { value: 'Done',      bg: C.greenLight,  fg: C.green   },
      { value: 'Upcoming',  bg: C.brandLight,  fg: C.brand   },
      { value: 'Cancelled', bg: C.surfaceGray, fg: C.textMid },
    ];
    for (const rule of calRules) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [range(calId, 1, 3, 1000, 4)],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: rule.value }] },
              format: {
                backgroundColor: rgb(rule.bg),
                textFormat: { foregroundColor: rgb(rule.fg), bold: true },
              },
            },
          },
          index: 0,
        },
      });
    }
  }

  return requests;
}

// ─── Number / date format requests ────────────────────────────────────────────

function buildNumberFormatRequests(sheetMap) {
  const requests = [];

  // Transactions: Amount column (F = index 5) — currency
  const txId = sheetMap['💰 Transactions'];
  if (txId !== undefined) {
    requests.push({
      repeatCell: {
        range: range(txId, 1, 5, 1000, 6),
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '#,##0.00' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });

    // Transactions: Date column (C = index 2) — date format
    requests.push({
      repeatCell: {
        range: range(txId, 1, 2, 1000, 3),
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  // Todos: Due Date (F = index 5)
  const todosId = sheetMap['✅ Todos'];
  if (todosId !== undefined) {
    requests.push({
      repeatCell: {
        range: range(todosId, 1, 5, 1000, 6),
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  // Calendar: Date (A = index 0)
  const calId = sheetMap['📅 Calendar'];
  if (calId !== undefined) {
    requests.push({
      repeatCell: {
        range: range(calId, 1, 0, 1000, 1),
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  return requests;
}

// ─── Special sheet: Dashboard ────────────────────────────────────────────────

function buildDashboardRequests(sheetId) {
  const requests = [];

  // Freeze row 1 and column A for navigation
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 3, frozenColumnCount: 0 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // Row heights for a card-like layout
  const rowHeights = [
    { idx: 0, h: 56 },  // brand header
    { idx: 1, h: 16 },  // spacer
    { idx: 2, h: 36 },  // section header
    { idx: 3, h: 32 },  // data row
    { idx: 4, h: 32 },
    { idx: 5, h: 32 },
    { idx: 6, h: 32 },
    { idx: 7, h: 20 },  // spacer
    { idx: 8, h: 36 },  // section header
    { idx: 9, h: 32 },
    { idx: 10, h: 32 },
    { idx: 11, h: 32 },
    { idx: 12, h: 32 },
    { idx: 13, h: 20 }, // spacer
    { idx: 14, h: 36 }, // section header
    { idx: 15, h: 32 },
    { idx: 16, h: 32 },
  ];
  for (const r of rowHeights) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: r.idx, endIndex: r.idx + 1 },
        properties: { pixelSize: r.h },
        fields: 'pixelSize',
      },
    });
  }

  // Column widths: A=240, B=280, C=200, D=200
  const colWidths = [240, 280, 200, 200, 200];
  colWidths.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize',
      },
    });
  });

  // Hero row (row 1): brand blue background full width
  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, 5),
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(C.brand),
          verticalAlignment: 'MIDDLE',
          horizontalAlignment: 'LEFT',
          textFormat: {
            foregroundColor: rgb(C.white),
            bold: true,
            fontSize: 18,
            fontFamily: 'Google Sans',
          },
          padding: { left: 24 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,textFormat,padding)',
    },
  });

  // Section header style helper
  const sectionRows = [2, 8, 14]; // 0-indexed row indices for section headers
  for (const r of sectionRows) {
    requests.push({
      repeatCell: {
        range: range(sheetId, r, 0, r + 1, 5),
        cell: {
          userEnteredFormat: {
            backgroundColor: rgb(C.surfaceGray),
            verticalAlignment: 'MIDDLE',
            horizontalAlignment: 'LEFT',
            textFormat: {
              foregroundColor: rgb(C.textMid),
              bold: true,
              fontSize: 9,
              fontFamily: 'Google Sans',
            },
            padding: { left: 16, top: 0, bottom: 0 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,textFormat,padding)',
      },
    });
  }

  // Data label cells (column A, rows 3-6 = index 3-6)
  requests.push({
    repeatCell: {
      range: range(sheetId, 3, 0, 17, 1),
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(C.white),
          verticalAlignment: 'MIDDLE',
          horizontalAlignment: 'LEFT',
          textFormat: {
            foregroundColor: rgb(C.textMid),
            bold: false,
            fontSize: 10,
            fontFamily: 'Google Sans',
          },
          padding: { left: 24 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,textFormat,padding)',
    },
  });

  // Value cells (column B, rows 3-16)
  requests.push({
    repeatCell: {
      range: range(sheetId, 3, 1, 17, 2),
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(C.white),
          verticalAlignment: 'MIDDLE',
          horizontalAlignment: 'LEFT',
          textFormat: {
            foregroundColor: rgb(C.textDark),
            bold: true,
            fontSize: 10,
            fontFamily: 'Google Sans',
          },
          padding: { left: 8 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,textFormat,padding)',
    },
  });

  // Merge hero row A1:E1
  requests.push({
    mergeCells: {
      range: range(sheetId, 0, 0, 1, 5),
      mergeType: 'MERGE_ALL',
    },
  });

  return requests;
}

// ─── Special sheet: Analytics ─────────────────────────────────────────────────

function buildAnalyticsRequests(sheetId) {
  const requests = [];

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // Header row
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, 6),
      cell: { userEnteredFormat: headerCellFormat(C.orange) },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  // Column widths
  [180, 180, 180, 180, 180, 180].forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize',
      },
    });
  });

  return requests;
}

// ─── Special sheet: Settings ──────────────────────────────────────────────────

function buildSettingsRequests(sheetId) {
  const requests = [];

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, 3),
      cell: { userEnteredFormat: headerCellFormat(C.textMid) },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  [260, 340, 320].forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize',
      },
    });
  });

  // Alternating rows
  requests.push({
    addBanding: {
      bandedRange: {
        range: range(sheetId, 1, 0, 50, 3),
        rowProperties: {
          headerColor:     rgb(C.textMid),
          firstBandColor:  rgb(C.white),
          secondBandColor: rgb(C.surfaceGray),
        },
      },
    },
  });

  return requests;
}

// ─── Special sheet: _Metadata ─────────────────────────────────────────────────

function buildMetadataRequests(sheetId) {
  const requests = [];

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, 2),
      cell: { userEnteredFormat: headerCellFormat(C.darkBg) },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  [260, 480].forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize',
      },
    });
  });

  // Data rows formatting
  requests.push({
    repeatCell: {
      range: range(sheetId, 1, 0, 20, 1),
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(C.surfaceGray),
          textFormat: { foregroundColor: rgb(C.textMid), bold: true, fontSize: 10, fontFamily: 'Google Sans' },
          padding: { left: 14, top: 6, bottom: 6 },
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,padding,verticalAlignment)',
    },
  });

  requests.push({
    repeatCell: {
      range: range(sheetId, 1, 1, 20, 2),
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(C.white),
          textFormat: { foregroundColor: rgb(C.textDark), bold: false, fontSize: 10, fontFamily: 'Google Sans' },
          padding: { left: 14, top: 6, bottom: 6 },
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,padding,verticalAlignment)',
    },
  });

  // Protect sheet from edits (soft lock via sheet protection)
  // Note: protection requires drive scope — we skip and just style it

  return requests;
}

// ─── Special sheet: _Archive ──────────────────────────────────────────────────

function buildArchiveRequests(sheetId) {
  const cols = COLUMNS['📦 _Archive'];
  const numCols = cols.length;
  const requests = [];

  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  requests.push({
    repeatCell: {
      range: range(sheetId, 0, 0, 1, numCols),
      cell: { userEnteredFormat: headerCellFormat(C.textLight, C.textDark) },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,padding,wrapStrategy)',
    },
  });

  cols.forEach((col, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: col.width, hiddenByUser: col.hidden },
        fields: col.hidden ? 'pixelSize,hiddenByUser' : 'pixelSize',
      },
    });
  });

  requests.push({
    addBanding: {
      bandedRange: {
        range: range(sheetId, 1, 0, 1000, numCols),
        rowProperties: {
          headerColor:     rgb(C.textLight),
          firstBandColor:  rgb(C.white),
          secondBandColor: rgb(C.surfaceGray),
        },
      },
    },
  });

  requests.push({
    setBasicFilter: {
      filter: { range: range(sheetId, 0, 0, 1, numCols) },
    },
  });

  return requests;
}

// ─── Values to write ──────────────────────────────────────────────────────────

function buildValueUpdates(spreadsheetId) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        // ── Dashboard ──
        {
          range: "'🏠 Dashboard'!A1",
          values: [['  ✦  TemanNyatet — Spreadsheet Database']],
        },
        {
          range: "'🏠 Dashboard'!A3",
          values: [['👤  PROFIL PENGGUNA']],
        },
        {
          range: "'🏠 Dashboard'!A4:B7",
          values: [
            ['Nama',             ''],
            ['Email / User ID',  ''],
            ['Status Koneksi',   '🟢 Connected'],
            ['Spreadsheet ID',   ''],
          ],
        },
        {
          range: "'🏠 Dashboard'!A9",
          values: [['📊  RINGKASAN DATA']],
        },
        {
          range: "'🏠 Dashboard'!A10:B13",
          values: [
            ['📝  Total Notes',        "=IFERROR(COUNTA('📝 Notes'!C2:C),0)"],
            ['✅  Total Todos',         "=IFERROR(COUNTA('✅ Todos'!C2:C),0)"],
            ['💰  Total Transaksi',     "=IFERROR(COUNTA('💰 Transactions'!C2:C),0)"],
            ['🔗  Total Links',         "=IFERROR(COUNTA('🔗 Links'!C2:C),0)"],
          ],
        },
        {
          range: "'🏠 Dashboard'!A15",
          values: [['⚙️  INFO TEMPLATE']],
        },
        {
          range: "'🏠 Dashboard'!A16:B17",
          values: [
            ['Template Version', "='🔒 _Metadata'!B2"],
            ['Terakhir Diperbarui', today],
          ],
        },

        // ── Notes headers ──
        {
          range: "'📝 Notes'!A1:I1",
          values: [['ID', 'User ID', 'Title', 'Category', 'Content', 'Tags', 'Favorite', 'Created At', 'Updated At']],
        },

        // ── Todos headers ──
        {
          range: "'✅ Todos'!A1:I1",
          values: [['ID', 'User ID', 'Task', 'Priority', 'Status', 'Due Date', 'Reminder', 'Created At', 'Updated At']],
        },

        // ── Transactions headers ──
        {
          range: "'💰 Transactions'!A1:I1",
          values: [['ID', 'User ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Payment Method', 'Created At']],
        },

        // ── Links headers ──
        {
          range: "'🔗 Links'!A1:G1",
          values: [['ID', 'User ID', 'Title', 'URL', 'Category', 'Tags', 'Created At']],
        },

        // ── Calendar headers ──
        {
          range: "'📅 Calendar'!A1:D1",
          values: [['Date', 'Event', 'Reminder', 'Status']],
        },

        // ── Analytics headers + labels ──
        {
          range: "'📊 Analytics'!A1:F1",
          values: [['Metric', 'Value', 'Target', 'Period', 'Change', 'Status']],
        },
        {
          range: "'📊 Analytics'!A2:B8",
          values: [
            ['Total Notes',      "=IFERROR(COUNTA('📝 Notes'!C2:C),0)"],
            ['Total Todos',      "=IFERROR(COUNTA('✅ Todos'!C2:C),0)"],
            ['Todos Done',       "=IFERROR(COUNTIF('✅ Todos'!E2:E,\"Done\"),0)"],
            ['Todos Progress',   "=IFERROR(COUNTIF('✅ Todos'!E2:E,\"Progress\"),0)"],
            ['Total Income',     "=IFERROR(SUMIF('💰 Transactions'!D2:D,\"Income\",'💰 Transactions'!F2:F),0)"],
            ['Total Expense',    "=IFERROR(SUMIF('💰 Transactions'!D2:D,\"Expense\",'💰 Transactions'!F2:F),0)"],
            ['Net Balance',      "=IFERROR(SUMIF('💰 Transactions'!D2:D,\"Income\",'💰 Transactions'!F2:F)-SUMIF('💰 Transactions'!D2:D,\"Expense\",'💰 Transactions'!F2:F),0)"],
          ],
        },

        // ── Settings headers + data ──
        {
          range: "'⚙️ Settings'!A1:C1",
          values: [['Setting', 'Value', 'Description']],
        },
        {
          range: "'⚙️ Settings'!A2:C12",
          values: [
            ['user_id',           '', 'ID pengguna dari Supabase Auth'],
            ['spreadsheet_id',    '', 'ID Google Spreadsheet ini'],
            ['timezone',          'Asia/Jakarta', 'Zona waktu pengguna (IANA format)'],
            ['currency',          'IDR', 'Mata uang default (ISO 4217)'],
            ['language',          'id', 'Bahasa antarmuka (ISO 639-1)'],
            ['theme',             'light', 'Tema aplikasi: light / dark / system'],
            ['date_format',       'DD/MM/YYYY', 'Format tanggal tampilan'],
            ['last_sync',         '', 'Timestamp sinkronisasi terakhir (diisi aplikasi)'],
            ['template_version',  "='🔒 _Metadata'!B2", 'Versi template yang digunakan'],
            ['connector_version', "='🔒 _Metadata'!B4", 'Versi koneksi API'],
            ['notes',             '', 'Catatan bebas'],
          ],
        },

        // ── _Archive headers ──
        {
          range: "'📦 _Archive'!A1:E1",
          values: [['ID', 'Source Sheet', 'Archived At', 'User ID', 'Row Data (JSON)']],
        },

        // ── _Metadata ──
        {
          range: "'🔒 _Metadata'!A1:B1",
          values: [['Key', 'Value']],
        },
        {
          range: "'🔒 _Metadata'!A2:B8",
          values: [
            ['template_version',  '1.0.0'],
            ['template_id',       SPREADSHEET_ID],
            ['template_hash',     'teman-nyatet-template-v1'],
            ['connector_version', '1.0.0'],
            ['api_version',       'v1'],
            ['created_date',      today],
            ['author',            'TemanNyatet'],
          ],
        },
      ],
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 TemanNyatet Template Setup');
  console.log('   Spreadsheet ID:', SPREADSHEET_ID);
  console.log('   Service account:', credentials.client_email);
  console.log('');

  // 1. Fetch current spreadsheet state
  console.log('📋 Fetching current spreadsheet...');
  let meta;
  try {
    meta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  } catch (err) {
    if (err.code === 403) {
      console.error('❌ Access denied. Please share the spreadsheet with the service account as Editor:');
      console.error('   ' + credentials.client_email);
      process.exit(1);
    }
    if (err.code === 404) {
      console.error('❌ Spreadsheet not found. Check SPREADSHEET_TEMPLATE_ID.');
      process.exit(1);
    }
    throw err;
  }

  const existing = meta.data.sheets ?? [];
  const existingNames = existing.map(s => s.properties.title);
  const neededNames   = SHEETS.map(s => s.name);

  console.log('   Existing sheets:', existingNames.join(', ') || '(none)');
  console.log('');

  // 2. Build sheet-creation batch
  const addRequests = [];
  for (const sheet of SHEETS) {
    if (!existingNames.includes(sheet.name)) {
      addRequests.push({
        addSheet: {
          properties: {
            title: sheet.name,
            index: sheet.index,
            tabColorStyle: { rgbColor: rgb(sheet.tabColor) },
          },
        },
      });
    }
  }

  if (addRequests.length > 0) {
    console.log(`➕ Creating ${addRequests.length} sheet(s):`, addRequests.map(r => r.addSheet.properties.title).join(', '));
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: addRequests },
    });
  }

  // 3. Delete sheets not in our list (e.g. "Sheet1")
  const freshMeta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = freshMeta.data.sheets ?? [];
  const sheetMap  = {};  // name → sheetId
  for (const s of allSheets) {
    sheetMap[s.properties.title] = s.properties.sheetId;
  }

  const deleteRequests = allSheets
    .filter(s => !neededNames.includes(s.properties.title))
    .map(s => ({ deleteSheet: { sheetId: s.properties.sheetId } }));

  // 4. Reorder + recolor existing sheets (tab colors may need to be set)
  const reorderRequests = SHEETS
    .filter(s => sheetMap[s.name] !== undefined)
    .map((s, arrayIdx) => ({
      updateSheetProperties: {
        properties: {
          sheetId: sheetMap[s.name],
          index: arrayIdx,
          tabColorStyle: { rgbColor: rgb(s.tabColor) },
        },
        fields: 'index,tabColorStyle',
      },
    }));

  const cleanupBatch = [...reorderRequests, ...deleteRequests];
  if (cleanupBatch.length > 0) {
    console.log('🗂  Reordering & cleaning up sheets...');
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: cleanupBatch },
    });
  }

  // 5. Refresh sheet map after cleanup
  const finalMeta   = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const finalSheets = finalMeta.data.sheets ?? [];
  for (const s of finalSheets) {
    sheetMap[s.properties.title] = s.properties.sheetId;
  }

  console.log('✅ Sheet IDs mapped:', Object.entries(sheetMap).map(([n, id]) => `${n}=${id}`).join(', '));
  console.log('');

  // 6. Clear all sheet content (fresh start)
  console.log('🧹 Clearing existing content...');
  const clearRanges = neededNames
    .filter(n => sheetMap[n] !== undefined)
    .map(n => `'${n}'!A1:Z2000`);

  if (clearRanges.length > 0) {
    await api.spreadsheets.values.batchClear({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { ranges: clearRanges },
    });
  }

  // 7. Build formatting requests — batch in chunks of 50 to avoid API limits
  console.log('🎨 Applying formatting...');

  const headerColors = {
    '📝 Notes':        C.brand,
    '✅ Todos':         C.amber,
    '💰 Transactions':  C.pink,
    '🔗 Links':         C.purple,
    '📅 Calendar':      C.teal,
  };

  let allFormatRequests = [];

  // Dashboard
  if (sheetMap['🏠 Dashboard'] !== undefined)
    allFormatRequests.push(...buildDashboardRequests(sheetMap['🏠 Dashboard']));

  // Data sheets
  for (const [name, color] of Object.entries(headerColors)) {
    if (sheetMap[name] !== undefined)
      allFormatRequests.push(...buildSheetRequests(sheetMap[name], name, color));
  }

  // Analytics
  if (sheetMap['📊 Analytics'] !== undefined)
    allFormatRequests.push(...buildAnalyticsRequests(sheetMap['📊 Analytics']));

  // Settings
  if (sheetMap['⚙️ Settings'] !== undefined)
    allFormatRequests.push(...buildSettingsRequests(sheetMap['⚙️ Settings']));

  // _Archive
  if (sheetMap['📦 _Archive'] !== undefined)
    allFormatRequests.push(...buildArchiveRequests(sheetMap['📦 _Archive']));

  // _Metadata
  if (sheetMap['🔒 _Metadata'] !== undefined)
    allFormatRequests.push(...buildMetadataRequests(sheetMap['🔒 _Metadata']));

  // Chunk and send
  const CHUNK = 50;
  for (let i = 0; i < allFormatRequests.length; i += CHUNK) {
    const chunk = allFormatRequests.slice(i, i + CHUNK);
    console.log(`   Batch ${Math.floor(i/CHUNK) + 1}: sending ${chunk.length} format requests...`);
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: chunk },
    });
  }

  // 8. Data validation
  console.log('📋 Applying data validation...');
  const validationReqs = buildValidationRequests(sheetMap);
  if (validationReqs.length > 0) {
    for (let i = 0; i < validationReqs.length; i += CHUNK) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: validationReqs.slice(i, i + CHUNK) },
      });
    }
  }

  // 9. Conditional formatting
  console.log('🎭 Applying conditional formatting...');
  const cfReqs = buildConditionalFormatRequests(sheetMap);
  if (cfReqs.length > 0) {
    for (let i = 0; i < cfReqs.length; i += CHUNK) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: cfReqs.slice(i, i + CHUNK) },
      });
    }
  }

  // 10. Number formats
  console.log('🔢 Applying number formats...');
  const numReqs = buildNumberFormatRequests(sheetMap);
  if (numReqs.length > 0) {
    for (let i = 0; i < numReqs.length; i += CHUNK) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: numReqs.slice(i, i + CHUNK) },
      });
    }
  }

  // 11. Write values
  console.log('✏️  Writing content and headers...');
  await api.spreadsheets.values.batchUpdate(buildValueUpdates(SPREADSHEET_ID));

  console.log('');
  console.log('✅ Template setup complete!');
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Open the spreadsheet and verify the layout looks correct');
  console.log('   2. Make the spreadsheet publicly viewable (Anyone with link → Viewer)');
  console.log('   3. Share the template URL with users for the "Make a Copy" flow');
  console.log('      URL: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/copy');
  console.log('');
  console.log('   The service account email that users must share their copy with:');
  console.log('   ' + credentials.client_email);
  console.log('');
  console.log('   🔒 _Metadata!template_id has been set to:');
  console.log('   ' + SPREADSHEET_ID);
  console.log('   (This must match SPREADSHEET_TEMPLATE_ID env var on the API server)');
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message ?? err);
  if (err.errors) console.error('   API errors:', JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
