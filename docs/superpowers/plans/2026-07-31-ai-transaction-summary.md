# AI Transaction Summary Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current workspace. Steps use checkbox syntax for tracking.

**Goal:** Add a cached, credit-metered AI summary card to the financial transaction history with week, month, and custom-range periods.

**Architecture:** Keep transaction aggregation and the AI provider call inside a dedicated API service. The API reads the user's Google Sheet through `requireAuth`, sends only aggregated totals/categories to the existing SumoPod-compatible provider, consumes the existing credit RPC only after valid AI output, and stores one latest result per user/period in Supabase. The existing Keuangan page owns period selection and renders the inline cached summary card.

**Tech Stack:** Express 5, Supabase admin client, Google Sheets-backed transaction rows, existing `CreditService`, SumoPod/OpenAI-compatible chat completions, React/TypeScript, date-fns, Tailwind tokens, Radix Dialog.

## Global Constraints

- Use `consumeCredit(userId, 'ai_transaction_summary')`; do not create a second balance or ledger.
- Backend sends only aggregated totals and category summaries to AI, never raw transactions.
- Provider calls and cache writes stay server-side; financial data must not enter logs or third-party analytics.
- Comparison period has the same duration and ends immediately before the selected period.
- Cache hits do not consume credit; regenerate consumes one credit only after valid AI JSON.
- Cache is isolated by authenticated user and `(period_type, period_start, period_end)`.
- Empty periods must not produce fabricated insights.

---

### Task 1: Pure period and aggregation service

**Files:**
- Create: `artifacts/api-server/src/lib/transaction-summary.ts`
- Create: `artifacts/api-server/src/lib/transaction-summary.test.ts`

**Interfaces:**
- `type SummaryPeriodType = 'week' | 'month' | 'custom'`
- `type SummaryPeriodInput = { periodType: SummaryPeriodType; startDate: string; endDate: string }`
- `resolveSummaryPeriod(input): ResolvedSummaryPeriod` computes normalized dates and same-duration comparison dates.
- `aggregateTransactions(rows, period): AggregatedTransactionSummary` calculates totals, top 3 expense categories, and percentage changes without logging rows.
- `validateSummaryOutput(value): TransactionSummaryOutput` accepts only bounded structured JSON with `headline`, `totals`, `top_expense_categories`, `comparison`, and 1–2 `insights`.

- [x] **Step 1: Write failing tests** for week/month/custom comparison ranges, zero-baseline percentages, top-3 category ordering, empty periods, and invalid AI output.
- [x] **Step 2: Run the focused test file and confirm it fails because the service is not implemented.**
- [x] **Step 3: Implement date normalization, comparison range calculation, aggregation, safe percentage calculation, and strict output validation.**
- [x] **Step 4: Run the focused test file and confirm all cases pass.**

### Task 2: Cache migration and server persistence

**Files:**
- Create: `supabase/migrations/010_transaction_summary_cache.sql`
- Create: `artifacts/api-server/src/lib/transaction-summary-cache.ts`

**Interfaces:**
- `getCachedTransactionSummary(userId, period): Promise<TransactionSummaryRecord | null>`
- `consumeAndCacheTransactionSummary(userId, requestId, period, output): Promise<{ balance: number; summary: TransactionSummaryRecord }>`
- Cache records use the period key and structured JSON fields from the approved spec.

- [x] **Step 1: Add the Supabase migration** with ownership, JSONB output columns, unique user/period key, indexes, updated timestamp trigger, RLS, and service-role write policy.
- [x] **Step 2: Implement server-only read and atomic consume/cache helpers** that always apply `user_id` and the full period key.
- [x] **Step 3: Run API typecheck to verify the persistence helper compiles.**

### Task 3: Transaction summary API and AI provider

**Files:**
- Create: `artifacts/api-server/src/routes/transaction-summary.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

**Interfaces:**
- `GET /api/transactions/summary?period_type=week|month|custom&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `POST /api/transactions/summary/generate` with `{ period_type, start_date, end_date }`
- Cache read returns `{ cached: boolean, summary: TransactionSummaryRecord | null }`.
- Generate returns `{ summary: TransactionSummaryRecord, balance: number }`.

- [x] **Step 1: Define the route contract and smoke-test harness** covering unauthenticated 401 and invalid-period handling.
- [x] **Step 2: Run the unauthenticated smoke test before the route exists and record the expected missing-route failure.**
- [x] **Step 3: Implement authenticated GET/POST routes with `requireAuth` and `userRateLimit`.**
- [x] **Step 4: For generate, check provider configuration and current balance, load user-owned rows, aggregate both periods, and return an empty-period result without calling AI.**
- [x] **Step 5: Send only aggregate JSON to the existing AI endpoint with a transaction-specific Indonesian prompt; validate structured JSON; atomically consume `ai_transaction_summary` and cache the result through the Supabase RPC.**
- [x] **Step 6: Handle 400/402/428/502/503/504 without logging financial payloads; ensure provider/validation failures do not consume credit.**
- [x] **Step 7: Run API typecheck/build and the unauthenticated route smoke tests.**

### Task 4: Frontend API client and period controls

**Files:**
- Create: `artifacts/teman-nyatet/src/lib/transaction-summary.ts`
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`

**Interfaces:**
- Frontend `TransactionSummaryPeriod` contains `periodType`, `startDate`, and `endDate`.
- `getCachedTransactionSummary(period)` calls the GET endpoint.
- `generateTransactionSummary(period)` calls the POST endpoint.

- [x] **Step 1: Add typed API helpers and a stable period cache key.**
- [x] **Step 2: Extend the existing period filter with `Custom Range`, start/end date controls, validation, and inclusive date filtering.**
- [x] **Step 3: Load cached summaries when the resolved period changes and keep a memory cache keyed by period.**
- [x] **Step 4: Run frontend typecheck to catch period/type integration issues.**

### Task 5: Inline summary card and credit interactions

**Files:**
- Create: `artifacts/teman-nyatet/src/components/TransactionSummaryCard.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`

- [x] **Step 1: Render cache-miss CTA above the transaction list with clear “1 credit” copy.**
- [x] **Step 2: Render loading, populated, empty-period, error, and credit-exhausted states.**
- [x] **Step 3: Render headline, totals, top 3 categories, comparison, insights, and collapse/expand controls inline.**
- [x] **Step 4: Add regenerate confirmation using the existing Dialog primitives; only submit after confirmation and show the refreshed balance.**
- [x] **Step 5: On credit exhaustion, dispatch/open the existing Top Up AI Credit flow without introducing a new payment path.**
- [x] **Step 6: Run frontend typecheck/build and inspect the desktop/mobile layout in preview.**

### Task 6: Documentation, workflows, and final verification

**Files:**
- Modify: `docs/SUMOPOD-PAYMENT.md`

- [x] **Step 1: Document migration `010_transaction_summary_cache.sql`, endpoints, and the `ai_transaction_summary` ledger reason.**
- [x] **Step 2: Restart only the official `API Server` and `Start application` workflows, avoiding duplicate artifact workflow port ownership.**
- [x] **Step 3: Run API/frontend typecheck, API build, frontend build, and `git diff --check`.**
- [x] **Step 4: Smoke test GET/POST endpoints without a token and confirm both return 401.**
- [x] **Step 5: Screenshot Keuangan at desktop and mobile viewport and inspect browser/workflow logs for crashes or sensitive payload logging.**
- [x] **Step 6: Re-read the approved spec and verify every functional, privacy, and credit requirement against the implementation.**