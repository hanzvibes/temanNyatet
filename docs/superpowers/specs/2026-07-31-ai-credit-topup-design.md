# AI Credit Top-up Payment Design

## Goal

Enable users to purchase AI credit packages through the existing SumoPod payment integration, with Sandbox and Production selected by server environment.

## Scope

- Add a server-owned catalogue for the four existing AI credit packages.
- Create a separate payment-order flow for credit purchases.
- Reuse the existing SumoPod payment-link provider and webhook authentication.
- Grant credits through the existing atomic `grant_credit` Supabase RPC only after a validated successful webhook.
- Connect `TopUpSection` to the new checkout endpoint.

Subscription orders remain separate from credit orders so a credit purchase never changes subscription state.

## Data flow

1. Authenticated user selects a package ID in the frontend.
2. API validates the package ID against the server catalogue and creates a pending credit order.
3. API creates a SumoPod payment link using the configured server-side base URL and API key.
4. Browser navigates to the returned payment link.
5. SumoPod posts a signed/token-authenticated `payment.completed` webhook.
6. API validates order identity, payment identity, and amount, then atomically claims the credit order.
7. API calls `grant_credit` with the package amount and provider order reference.
8. Retries return success without granting credits twice.

## Security and reliability

- Client input contains only a package ID; price and credit quantity come from the server catalogue.
- API keys and webhook credentials remain server-only.
- Unknown, mismatched, failed, expired, or already-consumed orders never grant credits.
- The database uses a unique provider-payment reference and a per-order grant marker.
- Sandbox and Production differ only by `SUMOPOD_PAYMENT_BASE_URL` and deployment secrets.

## User experience

- Selecting a package shows a loading state and opens the SumoPod payment link.
- Provider or network failures show a clear toast and reset the buying state.
- Returning to the app refreshes the credit balance and ledger history.
- Existing package cards, history, and subscription UI remain intact.