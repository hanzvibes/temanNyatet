---
name: Responsive overlay lifecycle
description: Safely switch between mobile and desktop instances of an overlay when the viewport crosses a breakpoint.
---

Viewport-specific overlay instances must explicitly close and publish `open: false` when a breakpoint switch makes an open instance inactive.

**Why:** Returning `null` from an inactive instance while its controlled open state remains true can leave stale overlay/focus-lock state or reopen unexpectedly when the viewport switches back.

**How to apply:** When using separate mobile/desktop instances, watch the active breakpoint and reset the inactive instance's open/detail state before unmounting its rendered portal.