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
SUMOPOD_WEBHOOK_TOKEN=<regenerated Webhook Token>
```

The API key, Webhook Signing Secret, and Webhook Token shown in screenshots
must be considered compromised. Rotate them in SumoPod and update the new
values in the Vercel API project. Never put any of them in frontend
`VITE_*` variables or commit them.

The current backend validates either the HMAC signature headers
`X-Sumopod-Signature`/`X-Signature` using `SUMOPOD_WEBHOOK_SECRET`, or the
`X-Webhook-Token` header using `SUMOPOD_WEBHOOK_TOKEN`. Keep these credentials
separate. A valid HMAC or a valid token is sufficient; invalid or missing
credentials are rejected when either credential is configured.

## Database

Run `supabase/migrations/007_sumopod_payment_orders.sql` in the Supabase SQL
Editor after the earlier migrations and before enabling checkout. The migration
creates the server-only `payment_orders` reconciliation table and adds the
per-order activation marker used for webhook idempotency.

For AI credit top-ups, also run
`supabase/migrations/008_credit_payment_orders.sql`. It creates the
server-only `credit_payment_orders` reconciliation table. Purchased credits are
granted through the existing atomic `grant_credit` RPC with
`sumopod_topup` + the local order ID as the unique ledger reference.

Also run `supabase/migrations/009_protect_subscription_fields.sql`. It prevents
client-side profile updates from marking an unpaid account as `active`; only the
server-side payment webhook can change subscription state.

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

### AI credit top-up flow

1. Run migration `008_credit_payment_orders.sql` in Supabase.
2. Deploy the API from the latest source so
   `POST /api/credits/topup/create` and the credit branch of
   `/api/sumopod-webhook` are live.
3. Open Settings → AI Credit and choose a package.
4. The browser sends only the package ID; the API owns the package amount and
   creates a `TN-CREDIT-...` payment order.
5. Complete the payment in SumoPod Sandbox.
6. Confirm the `payment.completed` webhook returns `200` and the user's
   `credit_ledger` has one `sumopod_topup` row for that order.
7. Resend the same webhook and confirm the balance and ledger do not increase a
   second time.

The four server-owned packages are:

| Package | Credits | Price |
|---|---:|---:|
| Starter | 100 | Rp10.000 |
| Popular | 300 | Rp25.000 |
| Value | 700 | Rp50.000 |
| Power | 1.500 | Rp100.000 |

The same flow works in Production when the API deployment uses the Production
SumoPod base URL and credentials. Never put those values in `VITE_*` variables.

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

## Subscription center API

The authenticated subscription center reads its data from:

```text
GET /api/subscription/overview
```

The endpoint returns the caller's profile status, subscription payment history,
provider payment metadata when available, and AI credit balance/usage. It
derives the user from the Supabase Bearer token and does not expose service-role
access to the frontend.