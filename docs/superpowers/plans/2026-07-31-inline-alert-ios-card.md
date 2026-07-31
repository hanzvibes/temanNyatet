# Inline Alert iOS Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle TemanNyatet's active inline alerts into modern, minimal iOS-inspired cards without changing feature logic.

**Architecture:** Use the shared `Alert` primitive as the single reusable visual foundation, then migrate the active Google Drive connection warning/recovery panels to that primitive. Preserve existing state, copy, animation, actions, and accessibility semantics.

**Tech Stack:** React, TypeScript, Tailwind utility classes, class-variance-authority, Radix-compatible UI primitives, Framer Motion.

## Global Constraints

- Toast global and alert dialogs are out of scope.
- `role="alert"` must remain available on important inline alert content.
- Light/dark theme tokens must be used instead of hard-coded colors.
- Keep existing feature logic, copy, event handlers, and animation behavior unchanged.
- Preserve reduced-motion behavior already configured in `index.css`.

---

### Task 1: Add iOS Card variants to the shared Alert primitive

**Files:**
- Modify: `artifacts/teman-nyatet/src/components/ui/alert.tsx`
- Test: typecheck and build commands

**Interfaces:**
- Consumes: existing `Alert`, `AlertTitle`, and `AlertDescription` props.
- Produces: `default`, `destructive`, `success`, `warning`, and `info` visual variants with the same exported component API.

- [ ] **Step 1: Update the shared variant classes**

  Keep `role="alert"` and the existing exports. Add the iOS card surface treatment: larger radius, soft tinted background, low-opacity border, restrained elevation, flexible icon/content alignment, and status-specific text/icon colors using existing theme tokens.

- [ ] **Step 2: Keep title and description hierarchy compatible**

  Retain the current component names and children contract while improving title weight, description line-height, and spacing for wrapped content.

- [ ] **Step 3: Run the frontend typecheck**

  Run: `pnpm --filter @workspace/teman-nyatet run typecheck`

  Expected: exit code 0.

### Task 2: Migrate active connection inline panels to Alert

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`
- Test: frontend build and preview

**Interfaces:**
- Consumes: `Alert`, `AlertTitle`, and `AlertDescription` variants from Task 1.
- Produces: unchanged connection warning, recovery error, and disconnect confirmation behavior with the shared visual treatment.

- [ ] **Step 1: Replace the API server warning panel**

  Preserve `AnimatePresence`, `motion.div` height/opacity transitions, `apiServerError`, and the existing copy. Use `Alert variant="warning"` with the existing `WifiOff` icon.

- [ ] **Step 2: Replace the recovery error panel**

  Preserve `recoveryInfo.title` and `recoveryInfo.body`. Use `Alert variant="destructive"` with the existing `AlertTriangle` icon and shared title/description components.

- [ ] **Step 3: Replace the disconnect confirmation panel**

  Preserve the confirmation copy and buttons. Use the destructive card variant with the existing `AlertCircle` icon, centered layout, and existing action handlers.

- [ ] **Step 4: Run typecheck and production build**

  Run:

  ```bash
  pnpm --filter @workspace/teman-nyatet run typecheck
  pnpm --filter @workspace/teman-nyatet run build
  ```

  Expected: both commands exit 0. Existing sourcemap warnings may remain non-fatal.

### Task 3: Verify visual and accessibility behavior

**Files:**
- Verify: `artifacts/teman-nyatet/src/components/ui/alert.tsx`
- Verify: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`

- [ ] **Step 1: Confirm active alert usage**

  Search the source to ensure the migrated connection panels use the shared alert primitive and no close button or toast code was changed.

- [ ] **Step 2: Restart the web workflow**

  Restart `artifacts/teman-nyatet: web` and confirm Vite starts on port 5000.

- [ ] **Step 3: Check browser logs and preview**

  Capture the connection page preview and inspect browser logs for runtime errors. Confirm the cards remain responsive and readable in light/dark themes.

- [ ] **Step 4: Check the diff**

  Run `git diff --check` and confirm only the intended alert primitive, connection page, and design/plan documents changed.