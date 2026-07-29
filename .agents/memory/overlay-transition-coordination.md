---
name: Overlay transition coordination
description: Coordinate Radix dialogs and Vaul drawers so sequential overlays do not overlap during close and open transitions.
---

When one overlay opens another, close the first overlay and wait for its exit transition before dispatching the event that mounts the next overlay.

**Why:** Radix Dialog and Vaul Drawer render independent portals. Opening the drawer in the same click handler as closing the dialog briefly leaves both backdrops and focus traps active, producing stacked overlays.

**How to apply:** Use a short transition-aligned timer or an explicit close-complete callback, clear the timer on unmount/state reversal, and keep the second overlay event dispatch after the first overlay is closed.