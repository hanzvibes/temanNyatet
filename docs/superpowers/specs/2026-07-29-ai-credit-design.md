# AI Credit System Design

## Scope
Limit note summarization with per-user credits, atomic Supabase-backed balance changes, an immutable ledger, and a payment-provider boundary for future Mayar top-ups.

## Architecture
Supabase stores `user_credits` and `credit_ledger`. PostgreSQL RPCs lock the user's balance row and update balance plus ledger in one transaction. A profile-insert trigger grants the configurable initial balance (default 10). The API server owns `CreditService`, which calls the RPCs with the service role.

Summarization checks credit availability, calls the server-only AI provider, validates non-empty output, then consumes one credit. AI failures never debit. Concurrent debits are serialized by the RPC and cannot make balance negative. A generic `PaymentProvider` interface isolates Mayar webhook parsing and idempotency from credit granting.

## UI
The subscription settings section displays the authoritative credit balance. The summarize action displays a compact balance indicator and opens an animated exhaustion dialog on `CREDITS_EXHAUSTED`; its CTA opens subscription settings until checkout is connected.

## Verification
Unit tests cover service error mapping and summarize debit ordering; typecheck, frontend build, API build, and a preview screenshot verify integration.
