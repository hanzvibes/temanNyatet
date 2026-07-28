---
name: Light UI treatment
description: TemanNyatet uses restrained elevation and motion for a lighter native-feeling interface.
---

Shared UI should favor subtle borders, low-opacity shadows, small transform-only press feedback, and short opacity/translate transitions over heavy elevation, blur, or scale animations.

**Why:** The app’s native-feeling direction depends on calm surfaces and motion that confirms interaction without competing with content.

**How to apply:** Use the shared elevation tokens and Button/AnimatedListItem patterns first. Keep deeper shadows for overlays and sheets, and preserve the reduced-motion rules in `index.css`.