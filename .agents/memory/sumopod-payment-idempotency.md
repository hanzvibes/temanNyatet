---
name: SumoPod payment idempotency
description: Rules for reconciling SumoPod webhook retries without extending subscriptions twice.
---

Payment reconciliation must be idempotent at two boundaries: claim the local
payment order with a pending-only update, then guard profile activation with the
same local order ID. A webhook retry may retry a failed activation, but a
successful activation for that order must be a no-op.

**Why:** Providers can retry webhook deliveries, and a transient Supabase
failure can happen after the order has already been marked completed.

**How to apply:** Keep provider payment IDs and local order IDs server-side,
never activate from browser input, and preserve the per-order activation marker
when changing payment providers.