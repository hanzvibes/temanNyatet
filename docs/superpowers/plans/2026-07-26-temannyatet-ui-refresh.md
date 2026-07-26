# TemanNyatet UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved refined calm workspace visual system across TemanNyatet without changing business logic, routes, API contracts, auth behavior, or database structure.

**Architecture:** Centralize visual decisions in the existing CSS token layer and shared UI primitives, then make targeted class-only refinements in the shell, feature pages, and onboarding pages. Keep all existing state, event handlers, hooks, forms, and data contracts intact.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui primitives, Lucide, Vaul, Framer Motion.

## Global Constraints

- No new heavy dependencies.
- No hook, API, storage, auth, route, or database changes.
- Prefer shared styles and primitives over duplicated markup.
- Preserve responsive behavior and PWA/mobile affordances.
- Maintain accessible keyboard focus, readable contrast, visible labels, and touch-friendly controls.

---

### Task 1: Establish the visual foundation

**Files:**
- Modify: `artifacts/teman-nyatet/src/index.css`
- Modify: `artifacts/teman-nyatet/src/components/ui/button.tsx`
- Modify: `artifacts/teman-nyatet/src/components/ui/card.tsx`

**Interfaces:**
- Consumes: existing semantic CSS variables and Tailwind token aliases.
- Produces: refined palette, surface/elevation scale, typography roles, focus treatment, and shared button/card states.

- [ ] Update light/dark semantic tokens for warmer canvas, clearer ink contrast, grouped surfaces, and restrained module accents.
- [ ] Update radius, shadow, and typography role values without removing existing token names.
- [ ] Add global visible focus and reduced-motion-safe interaction rules while retaining existing press feedback.
- [ ] Make Button variants use consistent minimum touch sizing, border hierarchy, hover, focus, and disabled states.
- [ ] Make Card use the new surface/border/elevation hierarchy without changing its API.
- [ ] Run `pnpm --filter @workspace/teman-nyatet run typecheck`.

### Task 2: Refine shared feedback and navigation components

**Files:**
- Modify: `artifacts/teman-nyatet/src/components/PageStates.tsx`
- Modify: `artifacts/teman-nyatet/src/components/SearchBar.tsx`
- Modify: `artifacts/teman-nyatet/src/components/SidebarNav.tsx`
- Modify: `artifacts/teman-nyatet/src/components/BottomSheetNav.tsx`

**Interfaces:**
- Consumes: Task 1 semantic tokens and component states.
- Produces: consistent empty/loading/error feedback and responsive navigation chrome.

- [ ] Improve page empty/loading/error hierarchy with stable reserved space, accent containers, and useful CTA emphasis.
- [ ] Improve search field surface, label semantics, clear action target, focus state, and placeholder contrast.
- [ ] Refine sidebar brand block, navigation active/hover states, create CTA, and account footer spacing.
- [ ] Refine mobile bottom sheet backdrop, handle, nav tabs, and active-state contrast while preserving drag/snap behavior.
- [ ] Run frontend typecheck.

### Task 3: Apply the visual system to authenticated feature pages

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/TodoPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/LinkSaverPage.tsx`

**Interfaces:**
- Consumes: shared tokens, Button, PageStates, SearchBar, navigation chrome.
- Produces: improved page rhythm, card hierarchy, forms, modal/drawer surfaces, and interactive states.

- [ ] Refine page headers and content containers for consistent mobile/desktop spacing.
- [ ] Refine note, transaction, todo, and link cards with clearer hierarchy and focus/hover/disabled states.
- [ ] Refine summary and metadata treatments, keeping all displayed values and actions unchanged.
- [ ] Refine existing modals/drawers/forms through classes only; preserve submit handlers and validation.
- [ ] Run frontend typecheck and build.

### Task 4: Align auth and onboarding surfaces

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/AuthPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/PaymentPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/ArchivedPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`
- Modify: `artifacts/teman-nyatet/src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: shared visual tokens and controls.
- Produces: consistent entry, subscription, spreadsheet connection, and settings experiences.

- [ ] Add visible labels/stronger field hierarchy while preserving form registration, validation, and submit behavior.
- [ ] Refine onboarding cards, plan selection, privacy callouts, and primary/secondary actions.
- [ ] Refine settings drawer sections, profile header, menu rows, and form states.
- [ ] Run frontend typecheck and build.

### Task 5: Verify the complete UI-only change

**Files:**
- Review: all modified files from Tasks 1–4
- Update if needed: `docs/replit.md` only if run instructions need correction

**Interfaces:**
- Consumes: completed UI refresh.
- Produces: verified running preview and final change inventory.

- [ ] Restart the frontend workflow.
- [ ] Refresh workflow and browser logs; confirm no manifest runtime errors.
- [ ] Capture and inspect the app at the responsive preview path for desktop and mobile states.
- [ ] Run `pnpm run typecheck` and `pnpm --filter @workspace/teman-nyatet run build`.
- [ ] Review `git diff --stat` and `git diff --name-only` to confirm only intended UI/spec/plan files changed.