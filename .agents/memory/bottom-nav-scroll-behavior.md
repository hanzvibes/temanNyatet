---
name: Bottom navigation scroll behavior
description: Why the mobile bottom navigation observes nested scrolling centrally and how its visibility state is coordinated.
---

The mobile bottom navigation should observe scroll in the document capture phase and drive its visibility through a single transform MotionValue. Native scroll events do not bubble, so a listener attached only to a page wrapper misses the nested overflow containers used by the app.

**Why:** The app has independent scroll surfaces for notes, transactions, todos, and links. A shared capture listener keeps their behavior consistent without adding page-specific wiring or React renders on every frame.

**How to apply:** Keep the nav fixed and safe-area anchored; update only `translateY` through MotionValue inside `requestAnimationFrame`. Reset the offset when a sheet/overlay opens, when reduced motion is enabled, and when the active scroll target changes. Use a small hysteresis threshold to avoid micro-scroll jitter.