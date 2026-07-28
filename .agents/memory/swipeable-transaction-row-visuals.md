---
name: Swipeable transaction row visuals
description: Swipe-to-delete layers must stay visually hidden until a row is actively dragged
---

The transaction swipe-delete background should be opacity-driven by horizontal drag progress, while the foreground row keeps `w-full`, `min-w-0`, and a card background. This prevents the delete panel from appearing as a persistent red column or exposing gaps around mobile rows.

**Why:** A mobile screenshot exposed the always-rendered delete zone as a permanent red panel beside every transaction, making the finance list look split and broken.

**How to apply:** When refining transaction list layouts, preserve the swipe gesture but keep its background inert and visually transparent at rest; verify the idle state separately from the active swipe state.