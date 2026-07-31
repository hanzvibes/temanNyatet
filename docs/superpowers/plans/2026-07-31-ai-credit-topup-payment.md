# AI Credit Top-up Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable secure SumoPod Sandbox/Production payment links for AI credit top-ups and grant purchased credits exactly once.

**Architecture:** Add a credit-specific payment order model and route beside the existing subscription payment flow. Reuse SumoPod payment creation and webhook authentication, but branch credit orders into an atomic grant flow backed by a new Supabase table and the existing `grant_credit` RPC.

**Tech Stack:** Express 5, TypeScript, Supabase Postgres/RPC, SumoPod payment-link API, React, existing API client.

## Global Constraints

- The browser sends only a trusted package ID; server owns price and credit quantity.
- Credit orders never mutate subscription status.
- Webhook retries must be idempotent at both order-claim and credit-grant boundaries.
- API secrets never enter `VITE_*` variables or client responses.
- Support both Sandbox and Production through `SUMOPOD_PAYMENT_BASE_URL`.

---

### Task 1: Add the credit-order data model and server catalogue

**Files:**
- Create: `supabase/migrations/008_credit_payment_orders.sql`
- Create: `artifacts/api-server/src/lib/credit-payment-orders.ts`
- Create: `artifacts/api-server/src/lib/credit-packages.ts`

- [ ] Add the service-role-only `credit_payment_orders` table with package, amount, credit quantity, provider ID, status, and grant timestamp.
- [ ] Add unique indexes for order ID and provider payment ID.
- [ ] Define the four package IDs and amounts once in server code.
- [ ] Add helpers for pending creation, lookup, and terminal/completed claim.

### Task 2: Create checkout and webhook handling

**Files:**
- Create: `artifacts/api-server/src/routes/credit-payment.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/routes/sumopod-webhook.ts`

- [ ] Add `POST /api/credits/topup/create` requiring auth.
- [ ] Create a pending credit order, call SumoPod, and return only the payment link and order metadata.
- [ ] Reuse existing webhook authentication and route credit orders before subscription orders.
- [ ] Validate payment status, order, payment ID, and amount before claiming and granting credits.
- [ ] Return idempotent success for already-granted orders.

### Task 3: Connect the top-up UI

**Files:**
- Modify: `artifacts/teman-nyatet/src/components/TopUpSection.tsx`
- Modify: `artifacts/teman-nyatet/src/lib/apiClient.ts` only if a typed helper is required

- [ ] Call the checkout route with the selected package ID.
- [ ] Open the returned provider URL, handle loading/error states, and keep the card disabled while buying.
- [ ] Refresh balance/history when the page returns visible after provider redirect.

### Task 4: Verify the full change

- [ ] Run workspace typecheck and frontend/backend builds.
- [ ] Restart both workflows and confirm clean startup.
- [ ] Exercise invalid package and unauthenticated checkout responses locally.
- [ ] Capture the relevant authenticated UI state if available and inspect browser logs.