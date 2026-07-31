---
name: SumoPod webhook authentication
description: SumoPod Save & Test may authenticate with X-Webhook-Token instead of the HMAC signature header.
---

The webhook handler supports two server-only authentication mechanisms:
`SUMOPOD_WEBHOOK_SECRET` for HMAC headers and `SUMOPOD_WEBHOOK_TOKEN` for
`X-Webhook-Token`. When either credential is configured, a request is accepted
if either mechanism validates; invalid or missing credentials are rejected.

**Why:** SumoPod's Save & Test reached the production route but returned 401
because the provider used its Webhook Token while the backend only checked HMAC.

**How to apply:** Configure the current SumoPod Webhook Token as
`SUMOPOD_WEBHOOK_TOKEN` in the Vercel API project, redeploy, and use Save & Test.
Never paste the token into chat, source control, or frontend `VITE_*` variables.