# Minimal Editorial Finance View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Finance page into a spacious, flatter editorial finance experience while preserving all behavior, design tokens, semantic colors, dark mode, and responsive accessibility.

**Architecture:** Keep the current `KeuanganPage` composition and data hooks intact. Refine the page-level Tailwind classes and local presentation components in `KeuanganPage.tsx`, using existing tokens and semantic utility classes. Avoid backend, schema, dependency, or global theme changes.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Vaul, React Hook Form, date-fns, lucide-react.

## Global Constraints

- Do not change primary, secondary, accent, finance, income, expense, or semantic color values.
- Preserve transaction creation, search/filtering, grouping, swipe-to-delete, loading, empty, error, responsive, and dark-mode behavior.
- Keep the existing React/Vite/Tailwind stack and component conventions.
- Do not add a charting dependency or change the data model.
- Maintain accessible focus states, labels, contrast, keyboard access, and comfortable touch targets.
- Keep mobile visual viewport and safe-area handling for the transaction sheet.

---

### Task 1: Simplify the balance presentation

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx` (`BalanceCard`, lines 57-163)

**Interfaces:**
- Consumes: Existing `balance`, `income`, and `expense` numeric props.
- Produces: The same balance summary content and semantic classes with a flatter editorial presentation.

- [ ] **Step 1: Add a presentation regression test or identify the existing frontend test harness**

Inspect the workspace scripts and existing test conventions before adding a test. If no frontend test runner exists, record the lack of a test harness and use the required typecheck plus preview screenshot as the verification for this presentation-only change. Do not introduce a new test dependency solely for styling.

- [ ] **Step 2: Refine `BalanceCard` without changing data or tokens**

Keep the existing `formatRupiah`, net calculation, income ratio, semantic `text-income`, `text-expense`, `bg-income`, and `bg-secondary` classes. Remove or reduce the decorative blurred ambient circles and replace the strongly elevated rounded card treatment with a flatter bordered surface and more generous editorial spacing. Retain the wallet affordance, balance update animation, net chip, income/expense values, and comparison rule.

- [ ] **Step 3: Verify the balance section statically**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run typecheck
```

Expected: the Finance page and frontend typecheck without errors.

- [ ] **Step 4: Commit the balance refinement**

```bash
git add artifacts/teman-nyatet/src/pages/KeuanganPage.tsx
git commit -m "refine finance balance presentation"
```

### Task 2: Rework page rhythm and transaction history styling

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx` (page layout and transaction history, lines 310-557)

**Interfaces:**
- Consumes: Existing `filteredTransactions`, `groupedTx`, `sortedDates`, `monthlySummary`, `SearchBar`, `AnimatedListItem`, and `SwipeableTransactionRow`.
- Produces: The same transaction list and interactions with clearer editorial hierarchy, flatter containers, and less visual clutter.

- [ ] **Step 1: Preserve the current interaction contract**

Before editing, confirm the following remain unchanged: `SearchBar` receives `value` and `onChange`; empty state invokes `handleOpenForm('expense')`; row deletion invokes `handleSwipeDelete`; each row retains `tabIndex`, `role`, `aria-label`, and focus-visible styling; the sidebar still renders only at `lg`.

- [ ] **Step 2: Refine header and page spacing**

Keep the sticky header and current responsive max-width structure, but reduce its border/backdrop emphasis and increase the intentional whitespace between the balance, search, history, and summary sections. Keep the existing page title and settings sheet. Do not change the background or text tokens.

- [ ] **Step 3: Flatten transaction groups**

Replace heavy group-card emphasis with a restrained list section: use subtle border/separator treatment, smaller radius or no outer radius where appropriate, and keep each transaction row at least 44px tall. Preserve category icons, source badges, note truncation, amount alignment, daily net values, and responsive narrow-screen grid behavior.

- [ ] **Step 4: Improve editorial date and history hierarchy**

Use the existing `getFormatDate` output and daily net calculation, but make date labels quieter and more readable through spacing and typography rather than stronger backgrounds. Keep the transaction count visible and ensure long amounts still wrap or truncate without overlap.

- [ ] **Step 5: Refine the desktop summary**

Keep the existing summary values and month label. Reduce its shadow and visual competition, use whitespace and a restrained divider hierarchy, and maintain the semantic income/expense classes.

- [ ] **Step 6: Run typecheck and inspect the rendered layout**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run typecheck
```

Then use the running frontend preview at `/keuangan` and inspect both a narrow mobile viewport and a desktop viewport. Expected: no overlap, no horizontal overflow, and the transaction list remains readable and swipeable.

- [ ] **Step 7: Commit the history refinement**

```bash
git add artifacts/teman-nyatet/src/pages/KeuanganPage.tsx
git commit -m "refine finance editorial transaction history"
```

### Task 3: Polish the transaction sheet controls

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx` (form sheet, lines 559-760)

**Interfaces:**
- Consumes: Existing `react-hook-form` state, transaction schema, category constants, payment sources, and Vaul drawer behavior.
- Produces: The same create-transaction flow with calmer editorial spacing and consistent accessible controls.

- [ ] **Step 1: Preserve form behavior before presentation edits**

Confirm the form still resets type/category/date/source when opened, formats numeric amounts, validates amount/category/date/source, submits through `createTransaction`, closes on success, and keeps the visual viewport height and safe-area styles.

- [ ] **Step 2: Refine the drawer shell and section spacing**

Keep the Vaul portal, overlay, bottom-sheet positioning, keyboard-aware height, and safe-area padding. Reduce excessive visual weight in the drawer border/shadow while preserving separation from the page. Use consistent vertical spacing between type toggle, amount, date/source, category, note, and submit areas.

- [ ] **Step 3: Refine inputs, segmented controls, and category buttons**

Keep existing focus utilities and finance semantic classes. Ensure each control remains keyboard accessible and at least 44px tall. Make inactive controls quieter, selected states clearer through existing token opacity/border classes, and labels consistent with the rest of the page. Do not introduce hardcoded replacement palette values.

- [ ] **Step 4: Verify the form flow statically and in preview**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run typecheck
pnpm run typecheck
```

Use the preview to open the transaction sheet, switch between expense/income, focus inputs, and confirm the layout remains usable at mobile width. Do not submit test data unless an authenticated test account is already available.

- [ ] **Step 5: Commit the sheet refinement**

```bash
git add artifacts/teman-nyatet/src/pages/KeuanganPage.tsx
git commit -m "polish finance transaction sheet"
```

### Task 4: Full verification and visual review

**Files:**
- Verify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`
- Verify: `artifacts/teman-nyatet/src/index.css`
- Verify: `artifacts/teman-nyatet/vite.config.ts`

**Interfaces:**
- Consumes: Completed Finance page refinements and existing workflow configuration.
- Produces: Evidence that the page runs, remains token-based, and is responsive in light and dark modes.

- [ ] **Step 1: Check for forbidden palette changes**

Run:

```bash
git diff -- artifacts/teman-nyatet/src/index.css
rg -n -- "--(primary|secondary|accent|finance|income|expense)|#[0-9a-fA-F]{6}|rgb\\(" artifacts/teman-nyatet/src/pages/KeuanganPage.tsx
```

Expected: no global token modifications and no newly introduced hardcoded color values in the Finance page.

- [ ] **Step 2: Restart the frontend workflow**

Restart `artifacts/teman-nyatet: web` after code changes and confirm it listens on port 5000 without startup errors. Keep the API workflow running for the existing relative `/api` proxy.

- [ ] **Step 3: Capture visual evidence**

Capture the running app at `/keuangan` in a mobile-sized viewport and a desktop-sized viewport. Review:

- Balance hierarchy and readable currency values.
- Search and add-transaction affordance spacing.
- Date headers and transaction separators.
- Long category/note/amount behavior.
- Desktop summary balance against the main content.
- No overlap, clipping, or horizontal scroll.

- [ ] **Step 4: Review dark mode and browser logs**

Toggle the existing theme if available, capture the Finance page again, and check browser/workflow logs. Expected: token-based contrast remains readable and there are no new browser errors.

- [ ] **Step 5: Run final checks**

Run:

```bash
pnpm run typecheck
pnpm --filter @workspace/teman-nyatet run build
```

Expected: both commands complete successfully.

- [ ] **Step 6: Commit the verified implementation**

```bash
git add artifacts/teman-nyatet/src/pages/KeuanganPage.tsx docs/superpowers/specs/2026-07-28-minimal-editorial-finance-design.md docs/superpowers/plans/2026-07-28-minimal-editorial-finance-plan.md
git commit -m "improve finance page editorial experience"
```

## Plan Self-Review

- Spec coverage: balance presentation, page rhythm, transaction history, desktop summary, transaction form, motion, accessibility, responsive behavior, dark mode, and verification are each covered above.
- Placeholder scan: no TODO/TBD implementation steps are required; presentation-only test handling explicitly accounts for the existing test harness.
- Type consistency: all tasks consume the existing `KeuanganPage` state, props, hooks, and component interfaces; no new cross-file interface is introduced.