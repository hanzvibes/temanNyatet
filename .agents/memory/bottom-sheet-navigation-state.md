---
name: Bottom sheet navigation state
description: Navigation behavior for the mobile bottom sheet across route changes.
---

The mobile bottom navigation sheet should stay collapsed on initial mount and after route changes. It may open only from the handle or an explicit page action event.

**Why:** Automatically reopening the sheet on every route change obscures pages such as Spreadsheet Backup and Subscription and makes navigation feel unpredictable.

**How to apply:** Treat route changes as a collapse/reset event. Keep explicit `open-bottom-sheet` requests available for page-level create actions.