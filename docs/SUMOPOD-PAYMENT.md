# SumoPod Sandbox Payment Runbook

TemanNyatet membuat payment link di server melalui SumoPod Sandbox. Browser
hanya menerima link pembayaran; API key tidak pernah dikirim ke frontend.

## Configuration

Set these as API-server environment secrets, never as `VITE_*` variables:

```text
SUMOPOD_PAYMENT_API_KEY=<regenerated Sandbox key>
SUMOPOD_PAYMENT_BASE_URL=https://api-pay-sandbox.sumopod.com
FRONTEND_URL=https://<frontend-domain>
SUMOPOD_WEBHOOK_SECRET=<only when SumoPod signing is configured>
```

The key visible in the original documentation screenshot must be revoked and
regenerated before testing.

## Database

Run `supabase/migrations/007_sumopod_payment_orders.sql` in the Supabase SQL
Editor after the earlier migrations and before enabling checkout. The migration
creates the server-only `payment_orders` reconciliation table and adds the
per-order activation marker used for webhook idempotency.

## Sandbox flow

1. Configure the API-server secrets.
2. Run the migration in Supabase.
3. Start the API and frontend workflows.
4. Configure this webhook URL in SumoPod Sandbox:
   `https://<api-domain>/api/sumopod-webhook`
5. Send a `payment.test` event and confirm it does not activate a profile.
6. Click a monthly or yearly plan. The API creates a local pending order first,
   then calls `POST /api/v1/payments` at the Sandbox base URL.
7. Complete the Sandbox payment and confirm the `payment.completed` event
   activates the matching plan.
8. Resend the same webhook and confirm the order remains a single activation.

Supported plans:

- Monthly: Rp100.000 (`100000` IDR)
- Yearly: Rp249.000 (`249000` IDR)

Failed and expired events are recorded as terminal order states and never
activate a profile. Refunds, chargebacks, recurring billing, and production
credentials are outside this Sandbox integration.