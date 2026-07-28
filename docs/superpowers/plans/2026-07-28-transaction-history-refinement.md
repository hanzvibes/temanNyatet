# Transaction History UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine only the non-empty Transaction History rendering in `KeuanganPage` into a consistent, responsive Material 3-inspired finance list.

**Architecture:** Preserve the existing grouped-by-date JSX, transaction data, `AnimatePresence`, `SwipeableTransactionRow`, and `AnimatedListItem` behavior. Change only the presentation classes and row layout so regular widths use a stable two-column row and very narrow widths move the amount below the metadata without changing any event handlers or data flow.

**Tech Stack:** React, TypeScript, Tailwind CSS v4 utilities, Framer Motion, Lucide React.

## Global Constraints

- Only modify the Transaction History rendering block in `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`.
- Do not modify the header, dashboard, charts, desktop sidebar summary, search, forms, hooks, API, navigation, or transaction logic.
- Preserve swipe-to-delete, enter/focus behavior, list animations, grouping, filtering, and all displayed values.
- Use an 8pt spacing rhythm where Tailwind utilities support it.
- Keep touch targets at or above 48px and protect long category names, notes, and currency values from overlap.

---

### Task 1: Refine the Transaction History layout and responsive row

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx:377-494`
- Test: `artifacts/teman-nyatet` production build and running workflow preview

**Interfaces:**
- Consumes: existing `sortedDates`, `groupedTx`, `deletingId`, `handleSwipeDelete`, `formatRupiah`, `getFormatDate`, and transaction fields.
- Produces: the same rendered transaction history and interaction behavior with refined responsive presentation.

- [ ] **Step 1: Normalize section and date-group spacing**

Replace fractional spacing values in the history block with 8pt-friendly utilities:
- use `space-y-6` for the history stack;
- use `gap-2` for date-header rules and label spacing;
- use `mb-3` for the date-to-card relationship;
- use `px-1` only for small alignment insets;
- use `px-4` and `py-3` for row content.

Keep the section count label and daily net values unchanged.

- [ ] **Step 2: Normalize card, icon, divider, and typography proportions**

Keep the existing grouped card and elevation treatment, but align dimensions:
- use a consistent `rounded-2xl` card radius;
- use a 48px icon container (`h-12 w-12`) and a 20px Lucide glyph;
- use a 72px minimum row height (`min-h-[4.5rem]`);
- use `gap-3` between icon, content, and amount;
- use 14px category text;
- use at least 11px metadata text;
- use `ml-16` for inset dividers so the divider starts after the 48px icon plus 16px content gutter;
- preserve income/expense color semantics and the source badge.

- [ ] **Step 3: Add narrow-screen amount fallback without changing behavior**

Implement the row content with responsive grid/flex classes:
- regular widths keep the amount in a right-aligned shrink-0 column;
- at the narrow breakpoint, let the row wrap and move the amount to a second line aligned with the content column;
- constrain the amount with `max-w-full`, `min-w-0`, and `break-words`/wrapping utilities as needed;
- retain truncation for category and note so long text cannot overlap;
- keep the row focus ring and `aria-label` unchanged.

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
git diff --check
```

Expected:
- frontend build completes successfully (apart from any pre-existing sourcemap warning);
- diff check has no whitespace errors;
- no files outside the scoped page and approved design/plan docs are modified.

- [ ] **Step 5: Restart and inspect the workflow**

Restart `artifacts/teman-nyatet: web`, refresh logs, and capture the running app preview. Confirm:
- Vite starts without a compile error;
- browser console has no new runtime error;
- the transaction history remains grouped by date;
- rows remain readable at desktop and narrow viewport widths;
- swipe-to-delete and animation components remain wired to the same handlers.