---
name: Transaction date normalization
description: Finance UI receives date-only values from Sheets and ISO timestamps from PostgreSQL.
---

Transaction date filtering must normalize the first ten characters (`YYYY-MM-DD`) before constructing a local date. PostgreSQL returns ISO timestamps while Google Sheets returns date-only strings; appending a time directly to an ISO value creates an invalid Date and hides transactions from period lists.

**Why:** The finance balance is computed from raw transactions while the list applies a period filter. Invalid filtered dates made the list empty even though the balance still showed a value.

**How to apply:** Use the shared transaction date helper for finance period filtering, grouping-related date comparisons, and any future UI logic that accepts both storage backends.