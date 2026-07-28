# Minimal Editorial Finance View

## Goal

Refine the existing TemanNyatet Finance page into a calmer, more spacious,
editorial mobile finance experience without changing the project’s established
brand palette, semantic colors, data behavior, or navigation patterns.

## Constraints

- Preserve all existing color tokens and values, including primary, secondary,
  accent, finance, income, expense, and semantic colors.
- Preserve existing transaction creation, filtering, grouping, swipe-to-delete,
  loading, empty, error, responsive, and dark-mode behavior.
- Keep the existing React/Vite/Tailwind stack and component conventions.
- Avoid introducing a new charting dependency or a new data model.
- Maintain accessible focus states, touch target sizes, labels, and contrast.

## Experience design

### Balance section

Use the balance as an editorial lead rather than a dense dashboard card:

- Keep a compact eyebrow label and the balance as the primary typographic
  focal point.
- Keep the monthly net indicator as a quiet inline status.
- Retain income and expense values, but reduce their visual weight.
- Replace heavy ambient decoration and elevated card styling with a flatter,
  lightly bordered surface or open layout.
- Retain the existing income/expense comparison rule using the existing
  semantic classes.

### Page rhythm and hierarchy

- Increase whitespace between major sections.
- Reduce nested rounded containers and competing borders.
- Use typography, alignment, and restrained dividers to establish hierarchy.
- Keep the header sticky and responsive, but make it visually quieter.

### Transaction history

- Retain search and grouped date sections.
- Simplify date headers into editorial labels with a subtle daily net value.
- Flatten transaction groups into clean list sections with inset dividers.
- Keep category icons, but use them as restrained visual anchors.
- Improve amount alignment and metadata truncation at narrow widths.
- Preserve keyboard focus, hover, pressed, and swipe-to-delete behavior.

### Desktop summary

- Retain the desktop-only monthly summary.
- Reduce its visual prominence with flatter styling and more whitespace.
- Keep all existing summary values and month labeling.

### Transaction form

- Preserve the bottom-sheet interaction and all fields.
- Improve section spacing and control consistency.
- Keep touch targets comfortable and focus states visible.
- Preserve visual viewport handling for mobile keyboards and safe areas.

## Motion

Use short opacity and translate transitions for balance updates, list changes,
and progress changes. Remove ornamental effects that do not communicate state.
Motion must remain subtle and respect the project’s existing animation patterns.

## Implementation boundaries

Primary work is limited to:

- `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`
- A narrowly scoped stylesheet adjustment only if existing utility classes
  cannot express the refinement without changing tokens.

No backend, API, schema, dependency, or global color changes are required.

## Verification

- Run the Finance page typecheck/build path.
- Confirm the frontend workflow starts cleanly.
- Capture the running Finance page in the preview.
- Inspect mobile-width and desktop-width layout behavior.
- Check browser logs for errors.
- Confirm dark-mode classes remain token-based and no palette values changed.
