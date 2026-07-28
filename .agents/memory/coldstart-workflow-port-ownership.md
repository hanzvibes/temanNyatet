---
name: Cold-start workflow port ownership
description: TemanNyatet preview startup requires one web workflow to own port 5000.
---

Only the registered `artifacts/teman-nyatet: web` workflow should bind the frontend preview port 5000; legacy duplicate web workflows must be removed.

**Why:** When two workflows launch Vite on port 5000, one loses the race with “Port 5000 is already in use.” The failed workflow can make a cold-start preview appear as a 404 even though another stale process is serving.

**How to apply:** Before restarting or diagnosing preview startup, inspect configured workflows and ensure there is exactly one webview workflow on port 5000. Clear orphaned Vite processes after removing a duplicate workflow.