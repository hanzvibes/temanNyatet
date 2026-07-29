---
name: AI credit architecture
description: The approved architecture for metering AI usage and future payment top-ups in TemanNyatet.
---

AI usage is metered through a Supabase balance row plus immutable ledger, with debit and grant operations performed by PostgreSQL RPCs that lock the balance row. The API server owns the credit service and payment-provider adapter; client code never receives payment secrets or decides credit amounts.

**Why:** The user approved this structure to prevent race conditions, preserve auditability, and keep Mayar-specific logic replaceable.

**How to apply:** New metered AI features should call the shared credit service and use a distinct ledger reason. Payment webhooks must use an idempotent provider reference when granting credits.