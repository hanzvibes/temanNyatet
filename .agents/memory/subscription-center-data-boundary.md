---
name: Subscription center data boundary
description: The server-owned data boundary for the subscription center and payment history UI.
---

The subscription center must compose profile status, payment-order history, provider metadata, and AI credit usage on the API server. The browser may render the returned overview but must not query payment-order tables with elevated access or infer payment state locally.

**Why:** Subscription status and payment reconciliation are security-sensitive, while keeping the composition server-side gives the UI one consistent view of payment and credit state.

**How to apply:** Add authenticated API fields or routes when the subscription center needs new provider data; derive identity from the Supabase Bearer token and return `null` when a receipt/provider field is not actually available.