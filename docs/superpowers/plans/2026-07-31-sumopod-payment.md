# SumoPod Sandbox Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TemanNyatet's Mayar checkout and webhook flow with a secure SumoPod Sandbox payment-link integration for monthly and yearly subscriptions.

**Architecture:** The API server owns SumoPod credentials, creates server-tracked pending orders, and exposes an authenticated checkout endpoint. A raw-body webhook reconciles SumoPod completion events against those orders and activates the matching Supabase profile exactly once. The React frontend requests checkout links instead of using a static provider URL.

**Tech Stack:** Express 5, TypeScript, Supabase Admin API/Postgres, React 19, Vite, TanStack Query-compatible custom API client, Vitest (if available; otherwise focused Node test scripts), SumoPod REST API.

## Global Constraints

- SumoPod API keys and webhook secrets are server-only environment secrets; never put them in Vite variables, source control, screenshots, logs, or browser responses.
- Sandbox base URL is `https://api-pay-sandbox.sumopod.com`.
- Supported plans and exact amounts are `monthly = 100000 IDR` and `yearly = 249000 IDR`.
- A completed payment must reconcile to a server-created order before subscription activation.
- Repeated webhook deliveries must be idempotent and must not extend or re-activate the same order twice.
- Do not treat `payment.failed`, `payment.expired`, or `payment.test` as successful payments.
- Keep the Sandbox skip control until a real Sandbox payment and webhook have been verified.
- Do not remove the existing Mayar route until the SumoPod route is verified; after verification, remove or deprecate obsolete Mayar configuration and UI references.

---

### Task 1: Add the payment-order persistence boundary

**Files:**
- Create: `supabase/migrations/007_sumopod_payment_orders.sql`
- Modify: `artifacts/api-server/src/lib/database.types.ts` only if generated/manual server types include database tables
- Test: `artifacts/api-server/src/lib/payment-orders.test.ts`

**Interfaces:**
- Produces a `payment_orders` table keyed by a unique local `order_id`.
- Stores `user_id`, `user_email`, `plan`, `amount`, `currency`, `status`, `sumopod_payment_id`, `payment_link_url`, `expires_at`, `completed_at`, and timestamps.
- Enforces `plan IN ('monthly','yearly')`, `status IN ('pending','completed','failed','expired')`, positive amount, and unique provider payment/order identifiers where present.
- Adds service-role-only access; browser clients must not read or mutate payment orders.

- [ ] **Step 1: Write the failing persistence contract test**

Create a test that asserts the order service exposes:

```ts
createPendingPaymentOrder({
  userId,
  userEmail,
  plan: 'monthly',
  amount: 100000,
}): Promise<PaymentOrder>
```

and that a completed order can be claimed once by its local `order_id` and provider `payment_id`. The test must assert that a second completion returns an idempotent “already completed” result rather than a second claim.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/payment-orders.test.ts
```

Expected: FAIL because the payment-order service and migration-backed operations do not exist yet.

- [ ] **Step 3: Add the idempotent SQL schema**

Create `007_sumopod_payment_orders.sql` with idempotent `CREATE TABLE IF NOT EXISTS`, constraints, unique indexes, service-role grants, and an update policy that only the service role can use. Use `timestamptz` for provider expiry/completion timestamps and keep secrets out of the table.

- [ ] **Step 4: Implement the server-side order service**

Create `artifacts/api-server/src/lib/payment-orders.ts` with:

```ts
export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentOrderStatus = 'pending' | 'completed' | 'failed' | 'expired';
export const PAYMENT_AMOUNTS: Record<PaymentPlan, number>;
export function isPaymentPlan(value: unknown): value is PaymentPlan;
export async function createPendingPaymentOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder>;
export async function getPaymentOrder(orderId: string): Promise<PaymentOrder | null>;
export async function markPaymentOrderCompleted(input: CompletePaymentOrderInput): Promise<CompletePaymentOrderResult>;
export async function markPaymentOrderTerminal(orderId: string, status: 'failed' | 'expired', providerPaymentId?: string): Promise<void>;
```

Use Supabase Admin queries and a conditional update (`status = 'pending'`) for completion claims. If the conditional update affects zero rows, re-read the order and return the existing completed state without performing subscription activation a second time.

- [ ] **Step 5: Run the focused test and verify it passes**

Run the same Vitest command and confirm the plan/amount constraints and duplicate-completion behavior pass. If this repository has no Vitest dependency, add the smallest existing-compatible test runner configuration rather than introducing a second test framework.

- [ ] **Step 6: Record the required manual migration step**

Document that `supabase/migrations/007_sumopod_payment_orders.sql` must be run in the Supabase SQL Editor before enabling checkout. Do not silently assume Replit can apply production schema changes.

---

### Task 2: Implement the SumoPod provider adapter

**Files:**
- Create: `artifacts/api-server/src/lib/sumopod-payment.ts`
- Modify: `artifacts/api-server/src/lib/payment-provider.ts`
- Test: `artifacts/api-server/src/lib/sumopod-payment.test.ts`
- Modify: `artifacts/api-server/.env.example`

**Interfaces:**
- Produces:

```ts
export type SumopodPaymentResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  paymentLinkUrl: string;
  expiresAt: string | null;
};
export async function createSumopodPayment(input: CreateSumopodPaymentInput): Promise<SumopodPaymentResponse>;
export function parseSumopodWebhook(payload: unknown): SumopodWebhookEvent | null;
```

- Consumes `SUMOPOD_PAYMENT_API_KEY`, `SUMOPOD_PAYMENT_BASE_URL`, and optional `SUMOPOD_WEBHOOK_SECRET`.
- Treats the provider response as untrusted input and rejects missing IDs, mismatched order/amount, non-URL checkout links, or unsupported statuses.

- [ ] **Step 1: Write failing adapter tests**

Cover:

1. Sandbox request construction uses `POST /api/v1/payments`, `Content-Type: application/json`, and `X-Api-Key`.
2. Request JSON contains exact IDR amount, `currency: 'IDR'`, order ID, expiry, and return URLs.
3. Provider response maps `payment_id`, `order_id`, `amount`, `status`, `payment_link_url`, and `expires_at`.
4. Malformed responses are rejected.
5. `payment.completed` payload parses into a completion event; failed/expired/test events parse into terminal non-success events.

- [ ] **Step 2: Run tests and verify the adapter tests fail**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/sumopod-payment.test.ts
```

Expected: FAIL because the adapter functions do not exist.

- [ ] **Step 3: Implement the adapter**

Use `fetch` with an explicit timeout via `AbortController`. Default the base URL to `https://api-pay-sandbox.sumopod.com`, but allow an environment override for controlled production migration later. Never include the API key in thrown errors or logs. Normalize webhook fields from the documented shape:

```json
{
  "event_type": "payment.completed",
  "data": {
    "payment_id": "uuid",
    "order_id": "INV-...",
    "amount": 50000,
    "status": "completed",
    "completed_at": "..."
  }
}
```

- [ ] **Step 4: Run adapter tests and typecheck**

Run the focused tests and:

```bash
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
```

Confirm all pass and no secret value appears in test output.

---

### Task 3: Add authenticated checkout-link creation

**Files:**
- Create: `artifacts/api-server/src/routes/payment.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/lib/payment-orders.ts`
- Test: `artifacts/api-server/src/routes/payment.test.ts`

**Interfaces:**
- Adds `POST /api/payment/create` protected by `requireUser`.
- Accepts `{ "plan": "monthly" | "yearly" }`.
- Returns `{ data: { order_id, payment_link_url, expires_at, plan, amount } }`.
- Returns `400` for invalid plans, `503` when SumoPod configuration is missing, and `502` for provider failures.

- [ ] **Step 1: Write failing route contract tests**

Test invalid plan rejection, missing-config rejection, and successful provider response mapped to the frontend-safe response. Assert the API key is only passed to the provider adapter and not returned in JSON.

- [ ] **Step 2: Run route tests and verify failure**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/payment.test.ts
```

Expected: FAIL because the route is not mounted.

- [ ] **Step 3: Implement the route**

Use `requireUser` to obtain `req.userId`, query the authenticated user email from Supabase Admin, validate the plan against `PAYMENT_AMOUNTS`, create the pending local order before calling SumoPod, and update it with the provider payment ID/link after a successful response. If provider creation fails, mark the local order failed and return a sanitized error.

- [ ] **Step 4: Mount and verify**

Mount `paymentRouter` in `routes/index.ts`, run the focused tests, and run API typecheck. Confirm the route does not require a Google Sheet connection.

---

### Task 4: Replace the Mayar webhook with SumoPod reconciliation

**Files:**
- Create: `artifacts/api-server/src/routes/sumopod-webhook.ts`
- Modify: `artifacts/api-server/src/app.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/lib/supabase-admin.ts` only if activation needs a user-id-safe overload
- Test: `artifacts/api-server/src/routes/sumopod-webhook.test.ts`

**Interfaces:**
- Adds `POST /api/sumopod-webhook`.
- Accepts raw JSON body before `express.json()` parsing.
- Acknowledges non-success events with `200`.
- Activates only verified/reconciled `payment.completed`.

- [ ] **Step 1: Write failing webhook tests**

Cover:

1. Missing/invalid JSON returns `400`.
2. Unknown local order returns a non-activating error.
3. Amount mismatch returns a non-activating error.
4. `payment.failed`, `payment.expired`, and `payment.test` do not activate.
5. First valid completion activates the expected plan.
6. Repeated completion for the same order returns an idempotent success and calls activation only once.
7. If `SUMOPOD_WEBHOOK_SECRET` is configured and the documented header is available, invalid signatures are rejected; if no signature scheme is documented, the response/log boundary explicitly identifies reconciliation-only verification.

- [ ] **Step 2: Run webhook tests and verify failure**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/sumopod-webhook.test.ts
```

Expected: FAIL because the route and reconciliation service do not exist.

- [ ] **Step 3: Implement raw-body handling**

Mount `express.raw({ type: 'application/json', limit: '1mb' })` for `/api/sumopod-webhook` before the global JSON parser. Do not expose the raw body or secrets in logs. Parse with the provider adapter after any configured verification step.

- [ ] **Step 4: Implement reconciliation**

For completion events, load the local order by `order_id`, verify provider payment ID and exact amount, atomically claim the order as completed, then call `activateSubscription` with the server-stored user email and plan. If the order is already completed, acknowledge without activating again. Mark failed/expired orders terminal without changing profile subscription status.

- [ ] **Step 5: Run focused tests and typecheck**

Run focused webhook tests, API typecheck, and `git diff --check`. Confirm logs contain order IDs/payment IDs only and never API keys or webhook secrets.

---

### Task 5: Replace frontend Mayar checkout actions

**Files:**
- Modify: `artifacts/teman-nyatet/src/lib/apiClient.ts` only if a typed payment helper is needed
- Modify: `artifacts/teman-nyatet/src/pages/PaymentPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/ArchivedPage.tsx`
- Modify: `artifacts/teman-nyatet/src/components/SettingsSheet.tsx`
- Test: `artifacts/teman-nyatet/src/pages/PaymentPage.test.tsx` or the repository's existing UI test location

**Interfaces:**
- Monthly/yearly buttons request `POST /api/payment/create`.
- Each button has an independent loading state.
- Successful response opens `payment_link_url` in a new tab/window.
- Errors show a retryable Indonesian message.
- No `VITE_SUMOPOD_*` or API key appears in frontend code.

- [ ] **Step 1: Write failing UI behavior tests**

Test that clicking Bulanan sends `{ plan: 'monthly' }`, clicking Tahunan sends `{ plan: 'yearly' }`, a successful response opens the returned URL, and a rejected request leaves the page usable with an error message. Test the archived/settings renewal actions use the same checkout helper rather than a static Mayar URL.

- [ ] **Step 2: Run UI tests and verify failure**

Run the repository's frontend test command for the new test file. Expected: FAIL because the page still uses `VITE_MAYAR_PAYMENT_URL`.

- [ ] **Step 3: Implement a small frontend checkout helper**

Add a typed helper around `apiPost` that maps provider error codes to Indonesian copy and returns only `{ order_id, payment_link_url, expires_at, plan, amount }`. Use `window.open` from the click handler so mobile browsers do not block the checkout tab.

- [ ] **Step 4: Update all payment entry points**

Replace Mayar static links in `PaymentPage`, `ArchivedPage`, and `SettingsSheet`. Keep logout and Sandbox skip behavior. Remove stale Mayar comments and `VITE_MAYAR_PAYMENT_URL` reads once all entry points use the helper.

- [ ] **Step 5: Run frontend tests, typecheck, and build**

Run:

```bash
pnpm run typecheck:libs
pnpm --filter @workspace/teman-nyatet run typecheck
pnpm --filter @workspace/teman-nyatet run build
```

Confirm no frontend bundle contains `SUMOPOD_PAYMENT_API_KEY` or any server secret.

---

### Task 6: Document Sandbox configuration and verify end to end

**Files:**
- Modify: `artifacts/api-server/.env.example`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-31-sumopod-payment-design.md` only if verified provider details require clarification
- Optional: `docs/SUMOPOD-PAYMENT.md`

- [ ] **Step 1: Document server variables**

Document:

```text
SUMOPOD_PAYMENT_API_KEY=<server-only regenerated Sandbox key>
SUMOPOD_PAYMENT_BASE_URL=https://api-pay-sandbox.sumopod.com
SUMOPOD_WEBHOOK_SECRET=<only when configured/supported>
FRONTEND_URL=<Replit or production frontend URL>
```

Explicitly state that the API key must never use a `VITE_` prefix.

- [ ] **Step 2: Document dashboard setup**

Document the Sandbox webhook URL:

```text
https://<api-domain>/api/sumopod-webhook
```

and the required success/cancel return URL behavior. Include the manual SQL migration step and the order to configure secrets, run migration, start workflows, configure webhook, and test.

- [ ] **Step 3: Run local verification**

Run:

```bash
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/teman-nyatet run typecheck
pnpm --filter @workspace/teman-nyatet run build
```

Restart both workflows and verify:

1. The app shows monthly/yearly checkout buttons.
2. Missing SumoPod configuration produces an actionable error, not a dead `#` link.
3. The API health endpoint remains `200`.
4. A SumoPod Dashboard `payment.test` event never activates an account.
5. A real Sandbox payment produces `payment.completed`, activates the correct plan, and remains idempotent when resent.

- [ ] **Step 4: Remove obsolete Mayar references after successful verification**

Only after the end-to-end Sandbox check passes, remove Mayar-only environment documentation and route comments. Keep a compatibility route only if there are existing production callers; otherwise delete it in a separate reviewed change.
