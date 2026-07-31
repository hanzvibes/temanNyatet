# Immersive Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TemanNyatet authentication page a responsive fullscreen immersive experience across mobile, tablet, desktop, and short landscape viewports.

**Architecture:** Keep `AuthPage` as the single owner of authentication state and actions. Replace only its page shell with a full-viewport canvas, subtle decorative layers, and a responsive elevated form surface; use existing theme tokens and reduced-motion behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, existing Supabase auth flow, Lucide icons.

## Global Constraints

- Preserve login, registration, password reset, email verification, terms, privacy, and Supabase behavior.
- Use `min-h-dvh` and safe-area padding; do not hardcode a fixed viewport height.
- Keep decoration low-contrast and non-interactive.
- Preserve visible keyboard focus states and readable error/status content.

---

### Task 1: Replace the authentication page shell

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/AuthPage.tsx:170-335`

**Interfaces:**
- Consumes the existing `isLogin`, `pendingEmail`, `confirmedFromEmail`, `isLoading`, and form state.
- Produces the same auth controls and callbacks inside a responsive immersive layout.

- [ ] **Step 1: Move the current auth content into a full-viewport immersive canvas**
  - Use `min-h-dvh`, safe-area insets, a responsive max-width, and a centered content column.
  - Add two absolute decorative organic shapes with `pointer-events-none` and `aria-hidden`.
  - Keep the brand section outside the card so the page retains hierarchy.

- [ ] **Step 2: Add the responsive elevated form surface**
  - Wrap confirmation status, verification state, and the login/register form in a white/theme card.
  - Use fluid padding and width classes so the card is full-width on small screens and capped on larger screens.
  - Keep all existing form controls, labels, error messages, and action handlers unchanged.

- [ ] **Step 3: Preserve short landscape behavior and accessibility**
  - Allow the page to scroll naturally in short landscape viewports.
  - Keep minimum touch targets, focus rings, and readable legal copy.

- [ ] **Step 4: Verify the frontend**
  - Run `pnpm --filter @workspace/teman-nyatet run typecheck`.
  - Restart `Start application` and capture the preview at desktop and a narrow mobile viewport.
  - Confirm no browser console errors and that the page fills the viewport without clipping.