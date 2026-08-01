# TESTING.md — TemanNyatet

> Documents the current automated and manual testing state.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| ROADMAP — planned testing improvements | [`ROADMAP.md`](./ROADMAP.md) |
| TASKS — actionable testing tasks | [`TASKS.md`](./TASKS.md) |
| UI_UX_GUIDELINES — UI patterns to test | [`UI_UX_GUIDELINES.md`](./UI_UX_GUIDELINES.md) |
| API.md — API behavior to test | [`API.md`](./API.md) |

---

## Current state

Automated regression tests currently cover note-title normalization, transaction
summary calculations, AI summary validation/copy, bottom navigation scroll
behavior, overlay state, and transaction-date normalization. The latest full
run passed **21 tests with 0 failures**. Repository/data-store integration tests
are still outstanding.

This is tracked as a documentation debt item. The priorities below are ordered by risk.

---

## Manual testing checklist

### Auth flows

- [ ] Sign up with new email → confirmation email received
- [ ] Confirmation email link goes to `/auth/confirm?token_hash=…&type=email` (not `/login?confirmed=true`)
- [ ] Click confirmation link → `AuthConfirmPage` shows "Memverifikasi email…" spinner
- [ ] Verification succeeds → shows "Email Terverifikasi" → redirects to `/login` after 1.5 s
- [ ] Confirmation link already used or expired → shows "Verifikasi Gagal" + "Kembali ke Login" button
- [ ] `/auth/confirm` accessible without being logged in (public route, no redirect)
- [ ] Log in with confirmed email → lands on `/connect-sheet` (first time) or feature page (returning user)
- [ ] Log in with unconfirmed email → immediately logged out (AuthContext enforcement)
- [ ] Session persists across browser refresh
- [ ] Session expires → redirected to `/login`

### Google OAuth / Spreadsheet

- [ ] Click "Hubungkan Google Drive" → Google consent screen opens with correct scope (`drive.file`)
- [ ] Approve consent → redirected back to app → spreadsheet created in user's Drive
- [ ] Open spreadsheet in Google Sheets → confirm 5 tabs exist: `📝 Notes`, `💰 Transactions`, `✅ Todos`, `🔗 Links`, `📦 _Archive`
- [ ] Disconnect Google Drive → `spreadsheet_id` cleared → redirected to `/connect-sheet`
- [ ] Reconnect → new spreadsheet created (old one still in Drive)
- [ ] `GET /api/spreadsheet/status` → correct response
- [ ] `POST /api/spreadsheet/repair` → missing tabs recreated

### Catatan (Notes)

- [ ] Empty state shows "Tambah Catatan Pertama" CTA button
- [ ] CTA button opens create drawer
- [ ] Create note with title + content + tags → appears in grid
- [ ] Note card shows correct pastel color
- [ ] Note row appears in `📝 Notes` tab of user's spreadsheet
- [ ] Edit note → changes reflected in grid + spreadsheet
- [ ] Delete note → removed from grid + moved to `📦 _Archive` tab
- [ ] Drag-and-drop reorder → `position` column updated in spreadsheet
- [ ] Search filters notes by title and content
- [ ] Search empty state does NOT show CTA button

### Keuangan (Finance)

- [ ] Empty state shows "Catat Transaksi" CTA button
- [ ] CTA opens create drawer defaulting to Expense tab
- [ ] Create expense → appears in list grouped by date
- [ ] Create income → appears with green amount
- [ ] Monthly summary (balance, income, expense) updates correctly
- [ ] Long-press on transaction (>800ms) → deletes → moved to `_Archive`
- [ ] Search filters by category and note
- [ ] Recharts bar chart renders (on Keuangan page with data)
- [ ] "Hari Ini" / "Kemarin" date group labels display correctly
- [ ] PostgreSQL numeric-string `amount` renders a valid balance, never `RpNaN`
- [ ] PostgreSQL ISO timestamps and Sheets `YYYY-MM-DD` values group/filter identically

### Todo

- [ ] Empty state title updated to "Belum ada to-do" (not "Semua beres!")
- [ ] Empty state shows "Buat To-Do" CTA button
- [ ] Create todo with title + description + due date + time
- [ ] Checkbox toggles is_done → item moves between pending/completed sections
- [ ] Click todo card → edit modal opens
- [ ] Edit title/description/dates → saved correctly
- [ ] Delete from edit modal → removed
- [ ] Desktop: two-column grid for pending/completed

### Link Saver

- [ ] Empty state shows "Simpan Link Pertama" CTA button
- [ ] Create link with title + URL + note → appears in grid with favicon
- [ ] Click link card → opens URL in new tab
- [ ] Copy button → URL copied to clipboard, sonner toast "URL disalin!"
- [ ] Long-press (>800ms) → deletes link
- [ ] Search filters by title and URL

### Subscription gate / SumoPod Sandbox

- [ ] New user → `/payment` page
- [ ] Confirm SumoPod production API deployment is current: `GET /api/healthz` returns `200` and a valid `POST /api/sumopod-webhook` is accepted
- [ ] SumoPod dashboard webhook URL is `https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook`
- [ ] Click SumoPod **Save & Test** and inspect the API deployment log
- [ ] Trigger SumoPod `payment.test` → order remains `pending` and profile is not activated by the test event
- [ ] Create monthly Sandbox checkout → local `payment_orders` row is created as `pending`
- [ ] Create yearly Sandbox checkout → amount is Rp249.000 and plan is `yearly`
- [ ] Complete a real Sandbox payment → `payment.completed` changes the matching order to `completed` and activates the matching plan
- [ ] Resend the same `payment.completed` webhook → subscription does not get extended twice
- [ ] Trigger failed/expired Sandbox events → order becomes terminal and profile is not activated
- [ ] Active user → access to all four feature pages
- [ ] Archived user → `/archived` page
- [ ] Active user visiting `/login` or `/payment` → redirected to `/catatan`

### PWA

- [ ] App installable (browser shows install prompt or `PwaInstallPrompt` appears)
- [ ] After install, app opens standalone (no browser chrome)
- [ ] Service worker registered (DevTools → Application → Service Workers)
- [ ] Assets precached (DevTools → Application → Cache Storage)
- [ ] App loads with data while offline (cached data shown)
- [ ] Mutations fail gracefully offline (error toast, no crash)
- [ ] `PwaInstallPrompt` hides when bottom sheet is open
- [ ] `PwaUpdatePrompt` appears when service worker updates

### Navigation / routing

- [ ] Tab switches are instant (no flash, no spinner)
- [ ] Back-tab returns to same scroll position as left
- [ ] All four main tabs accessible from bottom sheet nav (mobile) and sidebar (desktop lg+)
- [ ] Unmatched URL → NotFound page with "Kembali ke Catatan" button
- [ ] Escape key closes detail modals

### Dark mode

- [ ] Toggle in SettingsSheet switches dark/light
- [ ] Preference persists across browser refresh
- [ ] No flash of wrong theme on page load
- [ ] All four pages visually correct in dark mode (no bright pastels on dark canvas)
- [ ] Note card colors are dark variants (dark muted tints, not bright pastels)

### Mobile (physical device or DevTools throttling)

- [ ] Bottom sheet nav renders and snaps correctly (collapsed / half / expanded)
- [ ] All CTA buttons are thumb-reachable (visible without scrolling on empty state)
- [ ] Long-press delete works on touch
- [ ] Drawer forms keyboard-aware (input fields are visible above soft keyboard)
- [ ] Tap targets are ≥44px on all interactive elements

---

## What to automate next (priority order)

When expanding the current test suite, implement in this order:

### 1. Repository/data-store tests (highest ROI)

Test PostgreSQL repository and data-store selection:
- create/update/delete for all four entities
- ownership isolation and soft-delete visibility
- note reorder
- transaction summary
- allowlist selection and no silent Sheets fallback
- PostgreSQL write success independent of future mirror failure

### 2. API server unit tests

Test `sheet-store.ts` with a mocked Google Sheets client:
- `createRow` generates valid UUID and correct schema
- `listByUser` filters by user_id correctly
- `updateRow` returns null for missing row
- `deleteRow` moves row to `_Archive`
- `reorderRows` updates position values
- Formula injection guard prefixes dangerous characters

Test `middleware/requireAuth.ts`:
- Rejects missing Authorization header
- Rejects expired JWT
- Returns 428 for user with no spreadsheet

Test `sumopod-payment.ts` and payment-order reconciliation:
- Parses valid `payment.completed`, `payment.failed`, `payment.expired`, and `payment.test` events
- Rejects invalid or incomplete provider payloads
- Accepts a valid HMAC signature and rejects an invalid one
- Creates a payment request with the server-only API key and expected amount
- Claims a pending local order only when provider payment ID and amount match
- Replayed completion does not activate or extend a subscription twice
- Failed, expired, and test events never activate a profile

### 2. Frontend hook tests

Test `apiClient.ts`:
- Attaches Bearer token from token getter
- Retries once on 401 response
- Throws typed error for known error codes

### 3. Integration / E2E (lower priority)

If E2E is added, use Playwright. Key flows to cover:
- Auth: sign-up → confirm → login
- Google OAuth redirect (mock Google, test redirect + state verification)
- Create note → verify row in sheet (mock Google Sheets API)
- Subscription webhook → verify `subscription_status` change

---

## Recommended test stack

| Layer | Tool |
|---|---|
| API unit tests | Vitest + `supertest` |
| Frontend unit tests | Vitest + Testing Library |
| E2E | Playwright |
| Mock HTTP | `msw` (Mock Service Worker) |
| Mock Google Sheets | Custom mock implementing `sheets_v4.Sheets` interface |
