---
name: Subscription activation boundary
description: The invariant for subscription status changes in TemanNyatet.
---

Subscription status, plan, expiry, and payment order markers are server-owned state. The browser may start checkout, but only a validated payment webhook may activate or renew a subscription.

**Why:** A client-side onboarding skip once changed a newly registered user's pending profile to active without payment.

**How to apply:** Keep profile subscription fields protected by a Supabase trigger/RLS boundary, and route all activation through the API's provider webhook reconciliation.