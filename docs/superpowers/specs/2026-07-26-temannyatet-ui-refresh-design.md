# TemanNyatet UI/UX Refresh Design

Date: 2026-07-26

## Goal

Refresh the TemanNyatet interface into a refined calm workspace while preserving
all business logic, routes, API contracts, authentication behavior, database
structure, and existing features.

## Direction

Keep the existing sage-and-pastel identity, but make it quieter and more
intentional:

- Warmer neutral canvas with stronger ink contrast.
- Three surface levels: page canvas, grouped surface, and raised card.
- Sage remains the primary brand signal.
- Feature accents remain distinct but restrained:
  - Catatan: sage
  - Keuangan: warm amber
  - To-do: muted blue
  - Link Saver: muted rose
- Poppins remains the product font to avoid a brand break.

## Scope

### Shared system

- Update CSS semantic tokens, dark-mode values, typography roles, elevation,
  border, and focus treatments.
- Refine shared Button, Card, SearchBar, PageStates, and navigation styling.
- Normalize touch targets, hover/focus/pressed/disabled states, and loading
  feedback.
- Keep existing motion, drag, long-press, drawer, modal, and navigation
  behavior intact.

### Authenticated screens

- Improve shell rhythm, desktop sidebar, mobile bottom sheet, and header
  hierarchy.
- Improve Catatan note grid/modal/form surfaces.
- Improve Keuangan balance summary, transaction grouping, and transaction cards.
- Improve To-do completion state, due metadata, and list grouping.
- Improve Link Saver title/domain hierarchy, actions, and cards.

### Onboarding/auth screens

- Align Auth, Payment, Archived, and Connect Sheet screens with the shared
  product visual system.
- Improve form labels, inputs, empty/loading/error feedback, and CTA hierarchy
  without changing submission or redirect logic.

## Constraints

- No new heavy dependencies.
- No hook, API, storage, auth, route, or database changes.
- Prefer shared styles and primitives over duplicated markup.
- Preserve responsive behavior and PWA/mobile affordances.
- Maintain accessible keyboard focus, readable contrast, visible labels, and
  touch-friendly controls.

## Verification

- Run workspace typecheck and frontend build.
- Restart the frontend workflow and inspect the app at mobile and desktop
  viewport sizes.
- Check browser/workflow logs for errors.
- Review the final diff to confirm changes are UI-only.