# Documentation Audit Report

**Last updated:** 2026-07-26 (full documentation synchronization wave)  
**Previous audit:** 2026-07-26 (Vercel production deploy wave)  
**Original audit:** 2026-07-23  
**Auditor:** Replit Agent  
**Mode:** Strict — source code is the only source of truth.  
**Scope:** All project Markdown files, environment example files, key configuration, and source code.

---

## Audit scope — this wave (July 2026 documentation sync)

### Files read (source of truth)

**API server:**
- `artifacts/api-server/src/index.ts` + `src/app.ts`
- `artifacts/api-server/src/routes/index.ts` (all routes)
- `artifacts/api-server/src/routes/{auth-google,notes,transactions,todos,links,spreadsheet,profile,subscription,webhook,cron,health}.ts`
- `artifacts/api-server/src/middleware/requireAuth.ts`
- `artifacts/api-server/src/lib/{google-oauth,user-sheet,sheet-store,supabase-admin}.ts`

**Frontend:**
- `artifacts/teman-nyatet/src/App.tsx`
- `artifacts/teman-nyatet/src/main.tsx`
- `artifacts/teman-nyatet/src/contexts/{AuthContext,CreateContext}.tsx`
- `artifacts/teman-nyatet/src/hooks/{useNotes,useTransactions,useTodos,useLinks}.ts`
- `artifacts/teman-nyatet/src/lib/{apiClient,database.types,supabase}.ts`
- `artifacts/teman-nyatet/src/components/PageStates.tsx`
- `artifacts/teman-nyatet/src/pages/{CatatanPage,KeuanganPage,TodoPage,LinkSaverPage,AuthPage,ConnectSheetPage,PaymentPage,ArchivedPage,not-found}.tsx`
- `artifacts/teman-nyatet/vite.config.ts`

**Database:**
- `supabase/migrations/001_initial_schema.sql` through `005_phase1_schema.sql`
- `supabase/migrations/fix_profiles_rls_recursion.sql`
- `lib/db/src/schema/index.ts`

**Config:**
- `package.json` (root + per-package)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `artifacts/api-server/vercel.json`
- `artifacts/teman-nyatet/vercel.json`

**Existing docs:**
- `README.md`, `CHANGELOG.md`, `DOC_AUDIT_REPORT.md`, `replit.md`
- `artifacts/api-server/docs/DEPLOY.md`
- `supabase/migrations/README.md`

---

## Files created this wave

| File | Purpose |
|---|---|
| `AI_CONTEXT.md` | AI-agent-optimized quick reference |
| `ARCHITECTURE.md` | Full system architecture |
| `DATABASE.md` | Schema reference (Supabase + Google Sheets) |
| `API.md` | Complete API route reference |
| `AUTH.md` | Authentication and authorization flows |
| `ENVIRONMENT.md` | All environment variables |
| `DEPLOYMENT.md` | Deployment runbook (Vercel + Replit) |
| `PRD.md` | Product requirements (confirmed features only) |
| `DECISIONS.md` | 10 Architecture Decision Records (ADRs) |
| `SECURITY.md` | Security controls and known limitations |
| `TROUBLESHOOTING.md` | Common problems and solutions |
| `ROADMAP.md` | Completed / in-progress / planned / future |
| `TASKS.md` | 12 prioritized actionable tasks |
| `UI_UX_GUIDELINES.md` | Frontend design system and conventions |
| `TESTING.md` | Current test state + manual checklist + automation roadmap |

## Files updated this wave

| File | Change |
|---|---|
| `CHANGELOG.md` | Added this audit wave as a new entry |
| `DOC_AUDIT_REPORT.md` | This file — updated to reflect current audit |
| `README.md` | Added "Documentation" section with links to all new docs |

## Files not changed

| File | Reason |
|---|---|
| `replit.md` | Accurate from previous audit; no new inaccuracies found |
| `supabase/migrations/README.md` | Accurate from previous audit |
| `artifacts/api-server/docs/DEPLOY.md` | Still accurate; superseded by `DEPLOYMENT.md` for high-level use, but retained as the detailed Google Cloud Console walkthrough |
| `artifacts/api-server/.env.example` | Accurate from previous audit |
| `artifacts/teman-nyatet/.env.example` | Accurate from previous audit |

---

## Findings

### Architecture observations

1. **Dual caching systems**: Data hooks use module-level `Map` cache + 15 s polling. TanStack Query `QueryClient` is present but not used for data fetching in the four main modules — only for `staleTime`/`gcTime` defaults and `invalidateQueries`. These are parallel, not unified.

2. **Orval pipeline partially used**: `lib/api-client-react` (Orval-generated TanStack Query hooks) is only used in `main.tsx` for token wiring (`setTokenGetter`). Data fetching in the four modules uses the custom `apiClient.ts` directly. The Orval pipeline is maintained but underutilized.

3. **CachedSwitch is the routing backbone**: Custom DOM `hidden`-toggle router in `App.tsx` replaces wouter's `Switch`. This keeps all visited pages mounted, preserving React Query cache and preventing refetch thrash. Any future page or route change must update `ROUTE_ENTRIES` in `App.tsx`.

4. **Google Sheets as a database has real constraints**: The in-process `Map` lock in `sheet-store.ts` prevents concurrent writes within a single process. On Vercel serverless (single-instance per invocation) this works. Horizontal scaling would require a distributed lock.

5. **Five migrations share `002_*` prefix**: Three files use `002_` prefix. The documented order is the authoritative run order — alphabetical sort would apply them incorrectly. This is a risk on automated migration tools.

### Technical debt

| Item | Risk level | Task |
|---|---|---|
| `lib/db/` unused | Low | TASK-006 |
| `lib/api-client-react` barely used | Low | TASK-007 |
| `002_*` migration collision | Medium | TASK-004 |
| `fix_profiles_rls_recursion.sql` ad-hoc | High | TASK-003 |
| No automated tests | High | TESTING.md |
| Long-press delete has no keyboard alternative | Medium | TASK-008 |
| No cron scheduler configured | Critical | TASK-001 |
| Data hooks use module-level Map (not useQuery) | Medium | TASK-005 |
| In-process sheet lock (no horizontal scale) | Low (Vercel serverless mitigates) | TASK-011 |

### Outdated documentation found and addressed

- **None found** in this wave — previous audits (July 23 + July 26 Vercel wave) had already corrected the major inaccuracies (service account → per-user OAuth, Supabase tables → Google Sheets, env var names).

### Unverifiable items (explicitly marked in generated docs)

- Exact Mayar dashboard URLs and webhook payload format (Mayar is external)
- Google Cloud Console publishing status (external)
- Whether a cron scheduler has been configured externally (not in repo)
- Custom domain `temannyatet.id` status (not configured in repo)

---

## Documentation coverage

| Area | Covered by |
|---|---|
| Architecture overview | `ARCHITECTURE.md`, `AI_CONTEXT.md` |
| API routes | `API.md` |
| Authentication | `AUTH.md` |
| Database schema | `DATABASE.md` |
| Environment variables | `ENVIRONMENT.md` |
| Deployment | `DEPLOYMENT.md`, `artifacts/api-server/docs/DEPLOY.md` |
| Product features | `PRD.md` |
| Architecture decisions | `DECISIONS.md` |
| Security | `SECURITY.md` |
| Troubleshooting | `TROUBLESHOOTING.md` |
| Roadmap | `ROADMAP.md` |
| Tasks / backlog | `TASKS.md` |
| UI/UX conventions | `UI_UX_GUIDELINES.md` |
| Testing | `TESTING.md` |
| Run instructions | `replit.md`, `README.md` |
| Supabase setup | `supabase/migrations/README.md` |

---

## Validation checklist (this wave)

- Every file path referenced in generated docs was verified to exist in the repository
- Every API route in `API.md` was verified against `artifacts/api-server/src/routes/index.ts` and the individual route files
- Every environment variable in `ENVIRONMENT.md` was verified against `src/index.ts` (required check) and usage in source files
- Every migration file in `DATABASE.md` was verified to exist in `supabase/migrations/`
- Every Google Sheets tab schema was verified against `SHEET_SCHEMAS` in `sheet-store.ts`
- Every `profiles` column was verified against `database.types.ts` and the migration files
- Route paths in `ARCHITECTURE.md` were verified against `ROUTE_ENTRIES` in `App.tsx`
- No speculative features were documented
- No fictional architecture was invented

---

## Remaining documentation debt (after this wave)

1. **`artifacts/api-server/docs/DEPLOY.md`** and **`DEPLOYMENT.md`** now overlap. Consider whether to merge them or keep DEPLOY.md as the detailed Google Cloud Console walkthrough and DEPLOYMENT.md as the high-level runbook. Current state: both are accurate, no contradiction.

2. **`supabase/migrations/README.md`** and **`DATABASE.md`** overlap on migration order and environment variables. `DATABASE.md` is more complete; `supabase/migrations/README.md` is the setup guide for Supabase specifically. Both are accurate; duplication is acceptable given their different audiences.

3. **No CONTRIBUTING.md**: The project doesn't have contributor guidelines. If external contributors are expected, add a `CONTRIBUTING.md` covering branching, pnpm setup, and the "no npm/yarn" constraint.

4. **OpenAPI spec accuracy**: `lib/api-spec/openapi.yaml` was not verified against current route implementations in this audit. See TASK-007.
