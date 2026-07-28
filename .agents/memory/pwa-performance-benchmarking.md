---
name: PWA performance benchmarking
description: Code-level PWA optimizations can be verified in preview, but installed-PWA frame smoothness requires a real mobile-device benchmark.
---

Preview builds can confirm bundle output, startup errors, service-worker behavior, and compositor-friendly code, but they cannot prove consistent 60 FPS on low- or mid-range installed PWAs.

**Why:** Installed PWA shells and mobile browser engines differ from desktop/proxied previews in memory pressure, viewport events, service-worker lifecycle, and GPU scheduling.

**How to apply:** After code-level performance work, benchmark browser versus installed PWA on a real device for startup, route navigation, scrolling, gestures, sheets, dialogs, dropped frames, long tasks, and memory growth.