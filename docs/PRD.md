# PRD.md — TemanNyatet Product Requirements Document

> Reflects the current implementation as of July 2026. Only documents confirmed features.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AI_CONTEXT — quick reference for AI agents | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| ROADMAP — completed / planned / future | [`ROADMAP.md`](./ROADMAP.md) |
| UI_UX_GUIDELINES — frontend design system | [`UI_UX_GUIDELINES.md`](./UI_UX_GUIDELINES.md) |
| ARCHITECTURE — how features map to system design | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |

---

## Product overview

**TemanNyatet** ("Friend Note-Taker" in Indonesian) is a mobile-first SaaS productivity PWA targeting Indonesian users. It provides four integrated modules in a single app: notes, personal finance tracking, to-do list, and link saving.

**Core differentiator**: Users retain a private Google Drive/Sheets data path,
while the app can progressively migrate successfully connected users to
PostgreSQL for faster everyday reads and writes. The migration is import-only
and does not delete or alter the user's Sheets data.

---

## Target user

Indonesian smartphone users who want a simple, fast, "sat-set" (no-frills, gets the job done) productivity tool they can trust with personal data.

---

## Business model

Subscription via **SumoPod Payment Gateway Sandbox**:

| Plan | Price | Duration |
|---|---|---|
| Monthly | Rp 100.000 | 30 days |
| Yearly | Rp 249.000 | 365 days |

New users sign up free → `subscription_status: pending` → must pay to access features → `active`. Expired subscriptions → `archived`.

The old Mayar webhook is retained only as a backend compatibility route for
existing callers; it is not used by the current frontend checkout.

---

## Core modules

### Catatan (Notes)

- Create, edit, delete, and drag-to-reorder notes
- Each note: optional title, body content (up to 50,000 chars), tags (multi-select from predefined list)
- Notes displayed as colored sticky-note cards (4 rotating pastels)
- Search by title and content
- Tags stored as JSON array per note
- AI summarization in Indonesian through the server-side provider
- New users receive 10 AI credits; each successful summary consumes one credit
- Failed or empty AI responses do not consume credits

### Keuangan (Finance Tracker)

- Record income and expense transactions
- Per-transaction: type (income/expense), amount (IDR), category, payment source, optional note, date
- Income categories: Gaji, Freelance, Bisnis, Investasi, Hadiah, Lainnya
- Expense categories: Makanan, Transport, Belanja, Tagihan, Kesehatan, Hiburan, Pendidikan, Lainnya
- Payment sources: BCA, BRI, BNI, Mandiri, GoPay, OVO, Dana, Cash, Lainnya
- Monthly summary card: total balance, total income, total expense
- Mobile/portrait layout includes a compact one-row monthly summary
- Transactions grouped by date; search by category or note
- Long-press on transaction to delete (800ms)
- Recharts bar chart for financial visualization (confirmed in codebase)

### To-Do List

- Create, edit, complete, and delete to-do items
- Per-item: title (required), description (optional), due date (optional), due time (optional)
- Checkbox to toggle completion
- Items split into "Belum Selesai" (pending) and "Selesai" (done) groups
- Search by title
- Desktop: two-column grid layout

### Link Saver (Bookmarks)

- Save links with title, URL, and optional note
- Google favicon displayed via `https://www.google.com/s2/favicons?domain=...&sz=64`
- Copy URL to clipboard (one tap)
- Click/tap to open in new tab
- Long-press to delete (800ms)
- Search by title or URL

---

## User flows

### Onboarding

```
Sign up → Email confirmation → Log in → Connect Google Drive → (pay if subscription_status: pending) → App
```

### Daily use

```
Open PWA → Instant load from cache → Tab to feature → Create/edit/delete items
```

### Subscription expiry

```
subscription_end passes → cron archives user → next login redirects to /archived page
```

---

## Navigation

- **Mobile**: Bottom sheet (`DraggableSheet` + `BottomSheetNav`) with snap states: collapsed (handle visible), half, expanded (shows all tabs + "+" quick-create buttons)
- **Desktop (lg+)**: Fixed left sidebar (`SidebarNav`)
- Four main tabs: Catatan, Keuangan, To-Do, Link Saver

---

## Non-functional requirements (confirmed from implementation)

| Requirement | Implementation |
|---|---|
| PWA installable | VitePWA + `manifest.json`, service worker via workbox |
| Offline capability | Precached assets; cached data renders instantly; mutations fail gracefully offline |
| Mobile-first | `min-h-dvh`, bottom sheet nav, thumb-reachable targets (min 44px) |
| Dark mode | Tailwind `.dark` class via localStorage theme preference |
| Data privacy | User data in their own Google Drive; API server never stores notes/transactions/todos/links |
| Performance | CachedSwitch keeps pages mounted; instant tab switches; lazy-loaded route chunks |
| Indonesian localization | Date formatting via `date-fns/locale/id`, IDR currency via `Intl.NumberFormat` |

---

## Out of scope (not implemented)

- Social/collaborative features
- Data export (CSV, PDF)
- Recurring transactions
- Budget limits / spending alerts
- Multiple spreadsheets per user
- Multiple Google accounts per user
- Mobile native apps (iOS/Android)
