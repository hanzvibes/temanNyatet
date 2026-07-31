---
name: Stale development service worker
description: Replit previews can retain an old production PWA worker.
---

Replit/local previews can retain a production PWA service worker from an
earlier install. That worker may serve an old `index.html` and leave the boot
shell waiting for a module graph that no longer exists.

**Why:** The dev server and module URLs can be healthy while a browser-controlled
worker still intercepts navigation and prevents the current app from mounting.

**How to apply:** On non-production hosts, unregister stale app workers and
reload once when a worker controls the page. Never perform this cleanup on the
production domain.