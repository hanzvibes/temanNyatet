---
name: Cold-start workflow port ownership
description: TemanNyatet preview startup requires one web workflow to own port 5000.
---

Only the registered `artifacts/teman-nyatet: web` workflow should bind the frontend preview port 5000; legacy duplicate web workflows must be removed. The SPA also needs a visible pre-React boot shell and a non-null unknown-route state during startup.

**Why:** When two workflows launch Vite on port 5000, one loses the race with “Port 5000 is already in use.” Separately, the frontend can serve HTML before the API finishes its build/start sequence, and returning `null` for the initial `/` route makes the preview look blank until auth redirects. A visible shell makes module failures recoverable.

**How to apply:** Before restarting or diagnosing preview startup, inspect configured workflows and ensure there is exactly one webview workflow on port 5000. Clear orphaned Vite processes after removing a duplicate workflow. Keep `index.html`'s inline boot shell and render a loading state for unmatched routes while `AuthGuard` redirects.