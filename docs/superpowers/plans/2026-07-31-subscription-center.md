# Subscription Center Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current workspace. Steps use checkbox syntax for tracking.

**Goal:** Build a hybrid subscription center with a concise SettingsSheet summary and a complete responsive `/subscription` page backed by authenticated API data.

**Architecture:** Extend the existing authenticated subscription API with an overview payload that joins the caller's profile, subscription payment orders, and AI credit ledger. Add a focused React page for the detailed experience, keep payment initiation on the existing server-owned checkout path, and use an event/route handoff from SettingsSheet rather than duplicating subscription logic.

**Tech Stack:** Express 5 + Supabase service-role queries, React + TypeScript + Wouter, Tailwind tokens already present, Framer Motion, Lucide icons, existing `apiGet`/`apiPost` client.

## Global Constraints

- Subscription fields remain server-owned; only validated payment webhooks may activate or renew a subscription.
- Frontend must never read `payment_orders` with elevated credentials.
- Receipt/payment links are displayed only when stored and available; never invent a receipt URL.
- Use existing design tokens, restrained elevation, transform/opacity motion, and responsive tap targets.
- Pending users continue to be routed to payment onboarding; active users may open `/subscription`.
- Every authenticated endpoint must derive identity from the Bearer token, never a query-provided user ID.

---

### Task 1: Subscription overview API

**Files:**
- Modify: `artifacts/api-server/src/routes/subscription.ts`
- Modify: `artifacts/api-server/src/lib/payment-orders.ts`
- Modify: `artifacts/api-server/src/lib/credit-service.ts`
- Test: `artifacts/api-server/scripts/smoke-subscription-overview.mjs`

**Interfaces:**
- Produces `GET /api/subscription/overview` requiring the existing Supabase Bearer token.
- Response data:
  ```ts
  {
    profile: {
      status: 'pending' | 'active' | 'archived';
      plan: 'monthly' | 'yearly' | null;
      started_at: string | null;
      ends_at: string | null;
      days_remaining: number | null;
      payment_method: string | null;
    };
    features: string[];
    history: Array<{
      order_id: string;
      plan: 'monthly' | 'yearly';
      amount: number;
      currency: 'IDR';
      status: 'pending' | 'completed' | 'failed' | 'expired';
      created_at: string;
      completed_at: string | null;
      payment_id: string | null;
      receipt_url: string | null;
      payment_link_url: string | null;
    }>;
    credits: {
      balance: number;
      purchased: number;
      used: number;
    };
  }
  ```
- `started_at` comes from the earliest completed order for the current active cycle when available; otherwise it is null.
- `payment_method` is `SumoPod` when a provider payment ID exists, otherwise null.
- `receipt_url` remains null because the current schema has no separate receipt field.

- [ ] **Step 1: Add a typed order-list helper** that selects only the authenticated user's orders and maps database columns to the API response shape.
- [ ] **Step 2: Add credit usage aggregation** using `credit_ledger`, counting positive amounts as purchased and negative amounts as used, while retaining the authoritative balance from `getCreditBalance`.
- [ ] **Step 3: Implement `GET /api/subscription/overview`** with explicit 401/404/503/500 responses and a static feature list.
- [ ] **Step 4: Add a smoke script** that checks unauthenticated requests return 401 without creating or mutating data.
- [ ] **Step 5: Run API typecheck/build and the smoke script.**

### Task 2: Full subscription page

**Files:**
- Create: `artifacts/teman-nyatet/src/pages/SubscriptionPage.tsx`
- Create: `artifacts/teman-nyatet/src/lib/subscription.ts`
- Modify: `artifacts/teman-nyatet/src/App.tsx`

**Interfaces:**
- `getSubscriptionOverview()` calls `apiGet<SubscriptionOverview>('/subscription/overview')`.
- The page renders pending, active, archived, loading, error, empty-history, and populated-history states.
- The transaction detail modal receives one history item and must close through Escape, close button, or backdrop.

- [ ] **Step 1: Define frontend subscription overview types and formatting helpers** for IDR, dates, status labels, and plan labels.
- [ ] **Step 2: Add the `/subscription` route and lazy page import** without changing pending-user redirects.
- [ ] **Step 3: Build the responsive page header and status hero** with badge, package, date range, payment method, and status-aware CTA.
- [ ] **Step 4: Add features card and quick action cards** for renew/manage package, AI credits, and usage.
- [ ] **Step 5: Add subscription history list, empty state, transaction detail modal, and FAQ accordion.**
- [ ] **Step 6: Add loading skeleton and retryable API error state.**
- [ ] **Step 7: Run frontend typecheck/build.**

### Task 3: Hybrid SettingsSheet integration

**Files:**
- Modify: `artifacts/teman-nyatet/src/components/SettingsSheet.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/SubscriptionPage.tsx`

- [ ] **Step 1: Add `Kelola Selengkapnya` to the existing subscription summary** and route to `/subscription` after closing the sheet.
- [ ] **Step 2: Keep existing quick actions working** for renew/upgrade and AI top-up, but avoid duplicating the full history UI inside the drawer.
- [ ] **Step 3: Add a compact status badge and package/date summary** using the already fetched `subStatus`.
- [ ] **Step 4: Ensure returning from checkout or subscription page refreshes profile/overview data.**
- [ ] **Step 5: Verify active, pending, and archived branches manually in the rendered code path.**

### Task 4: Verification and workflow recovery

**Files:**
- Modify: workflow configuration only if required to remove duplicate port ownership
- Modify: `docs/SUMOPOD-PAYMENT.md` with the subscription-center endpoint note

- [ ] **Step 1: Restart only the configured workflow names that own ports 5000 and 8080; do not start duplicate artifact workflows.**
- [ ] **Step 2: Run workspace typecheck, API build, and frontend build.**
- [ ] **Step 3: Smoke test `/api/subscription/overview` without a token and confirm 401.**
- [ ] **Step 4: Screenshot `/subscription` at desktop and narrow mobile viewport and inspect browser logs.**
- [ ] **Step 5: Run `git diff --check` and review the requirement checklist against the approved spec.**