# Transaction History UI Refinement Design

## Goal

Refine only the Transaction History section on `KeuanganPage` into a visually
consistent Material 3-inspired finance list that uses an 8pt spacing rhythm,
clear typography, stable alignment, and adaptive behavior for narrow screens.

All transaction data, grouping, search, swipe-to-delete, animations, and
navigation remain unchanged.

## Visual system

- Use spacing values based on the 8pt rhythm wherever Tailwind utilities allow:
  `gap-2`, `gap-3`, `gap-4`, `py-3`, `px-4`, `mt-1`, and `ml-16`.
- Use a 72px minimum transaction row height to preserve a comfortable touch
  target while keeping the list efficient.
- Standardize the category icon container to 48px and the icon glyph to 20px.
- Use 14px category text with semibold weight and a readable secondary line.
- Raise the secondary metadata from sub-10px text to a legible 11px label.
- Keep the daily net chip compact but use grid-aligned horizontal padding.
- Use a consistent card radius/token-compatible treatment and preserve existing
  elevation and color semantics.
- Align inset dividers with the content column using the 48px icon plus 16px
  gap, rather than a custom fractional offset.

## Responsive behavior

- On regular mobile, tablet, and desktop widths, keep the amount right-aligned
  in a dedicated shrink-0 column.
- On very narrow widths, switch each row to a two-column adaptive layout:
  the category/source block stays in the first row while the amount moves to a
  second row aligned under the content column.
- Long category names and notes remain truncatable without pushing the amount
  outside the card.
- Large currency values use a bounded width and allow wrapping at the adaptive
  breakpoint rather than overlapping neighboring text.
- Preserve minimum 48px interactive row height and visible focus treatment.

## Scope boundaries

Only the non-empty transaction history rendering block in
`artifacts/teman-nyatet/src/pages/KeuanganPage.tsx` will change. Do not modify
the header, dashboard, charts, sidebar summary, search behavior, form sheet,
hooks, API, or transaction business logic.

## Verification

- Run the frontend build and TypeScript check as far as the existing generated
  API-client prerequisite allows.
- Restart the frontend workflow and inspect browser logs.
- Capture the running app at desktop and narrow mobile-sized viewports when
  authenticated data is available.
- Run a diff check and confirm only the Transaction History JSX plus this design
  specification changed.