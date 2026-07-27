# ROADMAP.md — TemanNyatet

> Built from the current implementation. Only confirmed features are listed as Completed. Planned items reflect known intent, not invented features.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| PRD — product requirements | [`PRD.md`](./PRD.md) |
| TASKS — prioritized actionable tasks | [`TASKS.md`](./TASKS.md) |
| DECISIONS — architecture decisions that shape the roadmap | [`DECISIONS.md`](./DECISIONS.md) |

---

## Completed

### Core app
- [x] Four feature modules: Catatan, Keuangan, To-Do List, Link Saver
- [x] Supabase Auth — email/password with confirmation
- [x] Per-user Google Spreadsheet as data backend (Google OAuth2, `drive.file` scope)
- [x] Auto-create spreadsheet on first Google Drive connect
- [x] Subscription gate — Mayar payment webhook → `subscription_status: active`
- [x] Subscription plans: monthly (Rp100.000) and yearly (Rp249.000)
- [x] Auth guard: pending → /payment, archived → /archived, no spreadsheet → /connect-sheet
- [x] Cron endpoint for archiving expired subscriptions

### Frontend
- [x] PWA — installable, service worker via workbox, offline-cached assets
- [x] Mobile-first bottom sheet navigation (`DraggableSheet` + `BottomSheetNav`)
- [x] Desktop sidebar navigation (lg+)
- [x] Dark mode via Tailwind `.dark` class + localStorage persistence
- [x] CachedSwitch — instant tab navigation, React Query cache survives route changes
- [x] Lazy-loaded route chunks for fast first paint
- [x] Shared `PageStates.tsx` (PageEmpty + PageLoading + FormError) across all four pages
- [x] Drag-and-drop note reordering (dnd-kit, `SortableNoteGrid`)
- [x] Finance monthly summary card + Recharts bar chart
- [x] Todo checkbox + pending/completed split view
- [x] Link Saver with favicon display + copy to clipboard
- [x] Search across all four modules
- [x] PWA install prompt (positioned above bottom nav, hides during any open overlay)
- [x] Offline indicator component
- [x] Update prompt for service worker updates

### API server
- [x] Supabase JWT verification middleware
- [x] Per-user rate limiting (120 req/min)
- [x] Global rate limiting (300 req/15 min per IP)
- [x] Google Sheets CRUD with in-process lock
- [x] Soft delete to `_Archive` tab
- [x] Spreadsheet repair route (re-creates missing tabs + headers)
- [x] Formula injection guard on cell writes
- [x] Mayar webhook with HMAC-SHA256 signature verification
- [x] Profile avatar upload to Supabase Storage

### Deployment
- [x] Production on Vercel (two-project setup)
- [x] Vercel deployment documentation ([`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md))

### Documentation
- [x] Full documentation synchronization (July 2026) — ARCHITECTURE, API, AUTH, DATABASE, ENVIRONMENT, DEPLOYMENT, PRD, DECISIONS, SECURITY, TROUBLESHOOTING, ROADMAP, TASKS, UI_UX_GUIDELINES, TESTING

---

## In Progress

- [ ] UX improvements — empty state CTA buttons (Issue #1 — partially complete as of July 2026)

---

## Planned

### UX (known issues)
- [ ] Issue #2 — (to be described by maintainer)
- [ ] Issue #3 — (to be described by maintainer)
- [ ] Keyboard accessibility for long-press delete actions (Keuangan, Link Saver) — currently mouse/touch only
- [ ] Confirm dialog before delete (alternative to long-press with no confirmation)

### Technical debt
- [ ] Migrate data hooks (`useNotes`, `useTransactions`, `useTodos`, `useLinks`) from module-level Map cache to `useQuery` — unify caching, gain automatic retry
- [ ] Consolidate three `002_*` migration files into one (or renumber to avoid filename-order ambiguity)
- [ ] Promote `fix_profiles_rls_recursion.sql` to a numbered migration
- [ ] Remove `lib/db/` (unused Drizzle scaffolding) or adopt it for real schema management
- [ ] Audit `lib/api-spec/openapi.yaml` against current route implementations; regenerate or remove Orval pipeline if unused beyond token wiring

### Infrastructure
- [ ] External cron scheduler setup (GitHub Actions or cron-job.org) for `/api/cron/archive-expired`
- [ ] Shared lock for Google Sheets mutations (Postgres advisory lock) to support horizontal scaling

---

## Future Ideas

> Not committed. Would require significant design and implementation work.

- Data export (CSV / PDF) — let users download their notes or transaction history
- Recurring transactions for Keuangan (fixed monthly expenses)
- Budget limits and spending alerts for Keuangan
- Full-text search across all modules via a search index (current: client-side filter on loaded data)
- Custom note card colors (beyond the 4 predefined pastels)
- Collaboration / shared notes (would require rethinking the per-user spreadsheet model)
- Mobile native app wrapper (Capacitor / React Native)
- Custom domain (`temannyatet.id`)
