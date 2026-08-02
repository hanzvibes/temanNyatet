---
name: Notes reorder synchronization
description: Durable constraints for keeping drag-and-drop note ordering stable while background polling is active.
---

Optimistic note reordering must remain visible until the latest reorder write completes, and reorder requests must be serialized so rapid successive drops cannot finish out of order.

**Why:** Background polling can return a pre-reorder snapshot, and concurrent requests can otherwise leave PostgreSQL with an older arrangement than the user's latest drag action.

**How to apply:** Keep a synchronous local note snapshot for drag handlers, suppress poll replacement while a reorder is pending, and queue reorder API writes. Restore the previous order and show an error if the latest write fails.