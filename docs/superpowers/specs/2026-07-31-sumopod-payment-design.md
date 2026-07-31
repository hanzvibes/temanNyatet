# SumoPod Sandbox Payment Integration Design

## Goal

Replace the existing Mayar payment flow with a server-side SumoPod Sandbox
payment-link flow for TemanNyatet monthly and yearly subscriptions.

## Context

TemanNyatet currently sends users to a static Mayar URL and receives Mayar
webhook events in the API server. A successful webhook activates a Supabase
profile subscription. SumoPod's supplied quick start documents a REST API for
creating payment links and webhook events named `payment.completed`,
`payment.failed`, `payment.expired`, and `payment.test`.

The SumoPod API key must be stored as a server-only secret. The key visible in
the supplied screenshot must be revoked and regenerated before testing; it will
not be copied into source code, chat, or this repository.

## Proposed architecture

### 1. Server-side payment-link creation

Add an authenticated API endpoint that accepts only a known plan identifier:

- `monthly` → Rp100,000
- `yearly` → Rp249,000

The server generates a unique order ID, stores the pending order metadata
needed for webhook reconciliation, and calls:

`POST https://api-pay-sandbox.sumopod.com/api/v1/payments`

with:

- `Content-Type: application/json`
- `X-Api-Key: <server-only SumoPod key>`
- `order_id`
- `amount`
- `currency: "IDR"`
- `expires_in_hours`
- success and cancel return URLs

The endpoint returns only the SumoPod payment link and local order metadata to
the browser. The browser never receives the API key.

### 2. Frontend checkout

Replace Mayar URLs in the pending-payment page, archived page, and account
settings payment actions. Each plan button calls the authenticated API endpoint,
shows a loading state for that plan, and opens the returned
`payment_link_url`. API failures render an actionable Indonesian error instead
of silently navigating to `#`.

The existing “Lewati untuk sekarang” control remains available for Sandbox
testing and is explicitly not treated as a successful payment.

### 3. Webhook processing

Add a SumoPod webhook endpoint that accepts the raw request body and handles:

- `payment.completed`: reconcile the local order, verify the expected amount and
  plan, then activate the matching Supabase subscription.
- `payment.failed`, `payment.expired`, `payment.test`: acknowledge and log
  without activating a subscription.

The handler must identify the user from a server-created pending order, not
from untrusted browser input. It must be idempotent: repeated
`payment.completed` deliveries for the same payment/order cannot extend or
double-activate the subscription more than once.

The supplied SumoPod screenshots do not show a webhook signature scheme. Until
official SumoPod webhook signing documentation is available, the endpoint will
use a server-configured webhook secret if SumoPod provides one and will require
order reconciliation against server-created pending records. The implementation
must make the verification boundary explicit rather than pretending an
unverified payload is cryptographically authenticated.

### 4. Provider boundary

Keep provider-specific parsing and API calls behind a SumoPod adapter. The
adapter owns:

- plan-to-amount mapping
- request construction
- response validation
- webhook event parsing
- provider reference extraction

Subscription activation and credit ledger operations remain in existing
Supabase service functions.

## Data and persistence

The existing `profiles` table remains the source of truth for subscription
status. A small server-side payment-order record is required for secure
webhook reconciliation and idempotency. The implementation should use the
project's existing Supabase database conventions and add only the fields
necessary for:

- local order ID
- Supabase user/profile identity
- email snapshot for diagnostics
- plan and expected amount
- SumoPod payment ID and status
- activation timestamp

No API key or webhook secret is persisted in the database.

## Environment configuration

Add documented server-only variables:

- `SUMOPOD_PAYMENT_API_KEY`
- `SUMOPOD_PAYMENT_BASE_URL` (Sandbox default:
  `https://api-pay-sandbox.sumopod.com`)
- `SUMOPOD_WEBHOOK_SECRET` only if supported/configured by SumoPod
- `FRONTEND_URL` for success/cancel return URLs

The old Mayar payment variables and route names are removed or deprecated only
after the SumoPod flow is wired and verified, so an incomplete configuration
fails explicitly instead of silently falling back to a dead checkout.

## Error handling

- Missing server configuration returns a clear `503` from payment creation.
- Invalid plan input returns `400`.
- Provider timeout or malformed response returns `502` without exposing
  provider credentials.
- Unknown or mismatched webhook orders are rejected and logged.
- Duplicate completed webhooks return a successful idempotent acknowledgment
  without a second activation.
- Frontend checkout errors show a retryable message in Indonesian.

## Testing and verification

Before declaring the integration complete:

1. Unit-test plan amount mapping and SumoPod response parsing.
2. Unit-test webhook event parsing, amount/order matching, and duplicate
   delivery handling.
3. Run frontend/API typechecks and existing tests.
4. Use a mocked SumoPod Sandbox HTTP response to verify payment-link creation
   without exposing the real API key.
5. Confirm the API rejects missing configuration and invalid plans.
6. Confirm the frontend renders working monthly/yearly checkout states.
7. Configure the SumoPod Sandbox webhook URL and send a test event from its
   dashboard before using a real Sandbox payment.

## Out of scope

- Production SumoPod activation
- Refunds, chargebacks, and recurring auto-renewal unless SumoPod's API
  documentation explicitly supports them
- Removing the Sandbox skip control before real payment verification
- Replacing SumoPod's existing AI/OpenAI-compatible integration