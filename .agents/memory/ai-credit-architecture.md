---
name: AI credit architecture
description: The approved architecture for metering AI usage and future payment top-ups in TemanNyatet.
---

AI usage is metered through a Supabase balance row plus immutable ledger, with debit and grant operations performed by PostgreSQL RPCs that lock the balance row. The API server owns the credit service and payment-provider adapter; client code never receives payment secrets or decides credit amounts.

**Why:** The user approved this structure to prevent race conditions, preserve auditability, and keep Mayar-specific logic replaceable.

**How to apply:** New metered AI features should call the shared credit service and use a distinct ledger reason. Payment webhooks must use an idempotent provider reference when granting credits.

For generated AI artifacts that must be persisted, the debit and persistence write
should be one server-side transactional boundary with a non-null idempotency
reference. A provider success alone is not enough to charge the user if the
artifact cannot be saved.

**Why:** A cache/database failure between debit and persistence can otherwise
charge a user without delivering the generated result, while retries can create
duplicate ledger debits.

**How to apply:** Prefer a Supabase RPC that locks the balance, upserts the
artifact, writes the ledger entry, and returns the persisted artifact and balance.