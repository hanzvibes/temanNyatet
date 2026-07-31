# SumoPod Sandbox Payment Runbook

TemanNyatet membuat payment link di server melalui SumoPod Sandbox. Browser
hanya menerima link pembayaran; API key tidak pernah dikirim ke frontend.

## Current environment

Production is hosted on Vercel, while this Replit workspace is only for
development and testing. Frontend and API are separate Vercel projects:

```text
Frontend: https://teman-nyatet.vercel.app
API:      https://teman-nyatet-api-server.vercel.app
```

The current SumoPod Sandbox webhook URL is:

```text
https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook
```

That URL is correct. However, the currently observed production API deployment
returns `404 Cannot POST /api/sumopod-webhook`, while `GET /api/healthz`
returns `200`. This means the active Vercel deployment is older than the
repository source that contains the route. Redeploy the API Vercel project
before using SumoPod **Save & Test** or attempting a real Sandbox payment.

## Configuration

Set these as API-server environment secrets, never as `VITE_*` variables:

```text
SUMOPOD_PAYMENT_API_KEY=<regenerated Sandbox key>
SUMOPOD_PAYMENT_BASE_URL=https://api-pay-sandbox.sumopod.com
FRONTEND_URL=https://teman-nyatet.vercel.app
SUMOPOD_WEBHOOK_SECRET=<regenerated Webhook Signing Secret>
```

The API key, Webhook Signing Secret, and Webhook Token shown in screenshots
must be considered compromised. Rotate them in SumoPod and update the new
values in the Vercel API project. Never put any of them in frontend
`VITE_*` variables or commit them.

The current backend validates the HMAC signature headers
`X-Sumopod-Signature` or `X-Signature` when `SUMOPOD_WEBHOOK_SECRET` is set.
The SumoPod dashboard documentation also mentions `X-Webhook-Token`; token
validation is not currently implemented by the backend, so do not put the
Webhook Token into `SUMOPOD_WEBHOOK_SECRET`.

## Database

Run `supabase/migrations/007_sumopod_payment_orders.sql` in the Supabase SQL
Editor after the earlier migrations and before enabling checkout. The migration
creates the server-only `payment_orders` reconciliation table and adds the
per-order activation marker used for webhook idempotency.

## Sandbox flow

1. Deploy the API project with Root Directory `artifacts/api-server` from the
   latest `main` branch. Confirm `GET /api/healthz` returns `200`.
2. Configure the Vercel API-server secrets.
3. Run the migration in Supabase.
4. Start the Replit API and frontend workflows only when testing locally.
5. Configure this webhook URL in SumoPod Sandbox:
   `https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook`
6. Click **Save & Test** and confirm the API no longer returns `404`.
7. Send a `payment.test` event and confirm it does not activate a profile.
8. Click a monthly or yearly plan. The API creates a local pending order first,
   then calls `POST /api/v1/payments` at the Sandbox base URL.
9. Complete the Sandbox payment and confirm the `payment.completed` event
   activates the matching plan.
10. Resend the same webhook and confirm the order remains a single activation.

Supported plans:

- Monthly: Rp100.000 (`100000` IDR)
- Yearly: Rp249.000 (`249000` IDR)

Failed and expired events are recorded as terminal order states and never
activate a profile. Refunds, chargebacks, recurring billing, and production
credentials are outside this Sandbox integration.

## Redirect URLs

Configure these in SumoPod **Settings → Redirect URLs**:

```text
Success:
https://teman-nyatet.vercel.app/payment?status=success

Cancel:
https://teman-nyatet.vercel.app/payment?status=cancelled
```

These are browser redirects only. Webhook delivery must use the API URL above.