---
name: Performance route cache policy
description: TemanNyatet uses active-route-only rendering with React Query cache retention.
---

Unmount inactive pages instead of keeping every visited route hidden and alive; retain data in React Query so navigation back remains fast without background effects and subscriptions.

**Why:** Hidden pages accumulated memory, event listeners, motion work, and data subscriptions during a session. The cache provides the useful part of the old behavior without the ongoing render cost.

**How to apply:** When adding navigation or data pages, prefer cache-backed remounts and explicit invalidation over persistent hidden route trees. Avoid focus refetches that create mobile/PWA loading churn.