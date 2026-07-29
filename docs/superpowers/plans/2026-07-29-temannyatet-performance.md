# TemanNyatet Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TemanNyatet faster to start, smoother during interaction, more efficient with network/cache work, and more native-feeling as a PWA without changing product behavior.

**Architecture:** Preserve the existing active-route-only router and React Query cache policy. Improve delivery at the Vite/PWA boundary, then stabilize query-driven page renders and motion at the component boundary. Keep private API data network-controlled and use profiling/build evidence before introducing heavier techniques such as virtualization.

**Tech Stack:** React, TypeScript, Vite, VitePWA/Workbox, TanStack React Query, Framer Motion, dnd-kit, Vaul, Tailwind CSS.

## Global Constraints

- Preserve authentication, route redirects, Google Sheets-backed data, and API semantics.
- Preserve bottom navigation, bottom sheets, swipe interactions, drag-and-drop, and minimum touch targets.
- Keep active-route-only rendering; do not revive hidden persistent route trees.
- Do not cache private API or spreadsheet responses in the service worker.
- Use `transform` and `opacity` for frequent movement; avoid broad layout animation on long lists.
- Run `pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck` after TypeScript changes.
- Run the production frontend build after Vite/PWA changes.
- Run `git diff --check` before each task is considered complete.
- Installed-PWA smoothness must be described as requiring a real-device benchmark; preview checks only verify startup and rendering correctness.

---

### Task 1: Capture a reproducible performance baseline

Status: complete.

**Files:**
- Create: `docs/superpowers/performance-baseline.md`
- Inspect: `artifacts/teman-nyatet/vite.config.ts`
- Inspect: `artifacts/teman-nyatet/src/main.tsx`
- Inspect: `artifacts/teman-nyatet/src/App.tsx`

**Interfaces:**
- Produces a checked-in baseline format for later tasks to update.
- Does not change application behavior.

- [ ] **Step 1: Build the production frontend and record output**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
```

Record the generated asset names and their byte sizes from the build output. If
the build output does not print sizes, use:

```bash
du -ah artifacts/teman-nyatet/dist | sort -h | tail -30
```

- [ ] **Step 2: Record runtime startup behavior**

Run the frontend workflow and capture the app preview at `/`. Record whether
the first visible screen is login or an authenticated route, whether the
console has errors, and whether the service worker is deferred in production
code rather than registered during module evaluation.

- [ ] **Step 3: Write the baseline document**

Include:

```markdown
# TemanNyatet Performance Baseline

## Build
- Command:
- Date:
- Largest JS assets:
- Largest CSS/assets:

## Runtime
- Preview route:
- Visible first screen:
- Browser console errors:
- Service-worker registration strategy:

## Interaction checklist
- Route navigation:
- Search:
- Swipe:
- Drag-and-drop:
- Bottom sheet:
- Query-backed return navigation:
```

- [ ] **Step 4: Verify the baseline has no application changes**

Run:

```bash
git diff --check
```

Expected: exit code 0. Keep the baseline document factual; do not claim
installed-device FPS until a real device is tested.

### Task 2: Improve production chunking and startup delivery

Status: complete after baseline review; existing route/vendor chunking and
deferred service-worker registration were retained because they already met
the plan constraints.

**Files:**
- Modify: `artifacts/teman-nyatet/vite.config.ts`
- Modify: `artifacts/teman-nyatet/src/main.tsx`
- Verify: `artifacts/teman-nyatet/index.html`

**Interfaces:**
- Consumes the existing route-level dynamic imports in `App.tsx`.
- Produces a production build with cacheable route/vendor chunks and
  non-blocking service-worker registration.

- [ ] **Step 1: Inspect the current production chunk output**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
du -ah artifacts/teman-nyatet/dist/assets | sort -h | tail -30
```

Identify whether a single vendor chunk contains unrelated motion, chart,
drag-and-drop, or form libraries. Do not add manual chunks if the current
output is already route-cacheable and no measurable problem exists.

- [ ] **Step 2: Implement only evidence-based manual chunk boundaries**

If the baseline shows a monolithic vendor chunk, add stable `manualChunks`
boundaries in `vite.config.ts` for libraries that are loaded by multiple
routes, for example:

```ts
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'wouter'],
  'vendor-motion': ['framer-motion', 'vaul'],
}
```

Use the actual package names present in the lockfile. Keep feature-only
dependencies in route chunks; do not force all dependencies into an eagerly
loaded vendor chunk.

- [ ] **Step 3: Keep service-worker registration off the critical path**

Retain the existing idle/deferred registration. If the production build or
runtime baseline shows unnecessary first-load work, move only nonessential
registration bookkeeping behind the same idle callback. Do not call
`registerSW()` synchronously from module scope.

- [ ] **Step 4: Build and compare**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
du -ah artifacts/teman-nyatet/dist/assets | sort -h | tail -30
git diff --check
```

Expected: build exits 0, chunks are stable/readable, and no API route is
included in the service-worker navigation fallback.

- [ ] **Step 5: Typecheck and inspect workflow logs**

Run:

```bash
pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck
```

Restart the frontend workflow if Vite configuration changed, then inspect
workflow and browser logs for startup errors.

### Task 3: Stabilize query-backed page rendering

Status: reviewed; no speculative query changes were required. Existing
active-route-only rendering, retained React Query cache, and disabled focus
refetch policy already match the performance design.

**Files:**
- Inspect and modify only where needed:
  - `artifacts/teman-nyatet/src/hooks/useNotes.ts`
  - `artifacts/teman-nyatet/src/hooks/useTransactions.ts`
  - `artifacts/teman-nyatet/src/hooks/useTodos.ts`
  - `artifacts/teman-nyatet/src/hooks/useLinks.ts`
  - `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`
  - `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`
  - `artifacts/teman-nyatet/src/pages/TodoPage.tsx`
  - `artifacts/teman-nyatet/src/pages/LinkSaverPage.tsx`

**Interfaces:**
- Consumes the existing API hooks and QueryClient defaults.
- Produces stable query keys, cached-first rendering, and no duplicate
  subscription/request behavior.

- [ ] **Step 1: Trace every feature query**

Use:

```bash
rg -n "useQuery|queryKey|refetch|invalidateQueries|use[A-Z].*\\(" artifacts/teman-nyatet/src/hooks artifacts/teman-nyatet/src/pages
```

For each page, document the query key, enabled condition, stale-time override,
and mutation invalidation behavior. Identify duplicate requests before editing.

- [ ] **Step 2: Preserve cached data while refreshing**

Where a hook replaces useful cached data with an empty loading state, render
cached data while `isFetching` is true and reserve the full loading state for
the first request with no cached data. Do not add a fake fallback dataset.

- [ ] **Step 3: Stabilize derived collections and callbacks**

Use `useMemo` for filtered/sorted collections whose computation is nontrivial
and `useCallback` for handlers passed to memoized rows. Keep dependency arrays
complete. Do not memoize trivial values or alter mutation payloads.

- [ ] **Step 4: Prevent obsolete search/filter work**

If search filtering is observed to run on every keystroke over a large list,
use a small React transition/deferred value at the page boundary while keeping
the input controlled and immediate. Do not debounce server requests unless the
hook currently makes server requests per keystroke.

- [ ] **Step 5: Verify data behavior**

Run:

```bash
pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck
git diff --check
```

With the workflow running, verify that navigating away and back uses cached
content, mutations still update the list, and no new browser console errors
appear.

### Task 4: Reduce render and animation cost on frequent interactions

Status: complete.

**Files:**
- Modify: `artifacts/teman-nyatet/src/App.tsx`
- Inspect/modify as evidence requires:
  - `artifacts/teman-nyatet/src/components/SortableNoteGrid.tsx`
  - `artifacts/teman-nyatet/src/components/TodoCard.tsx`
  - `artifacts/teman-nyatet/src/components/SwipeableRow.tsx`
  - `artifacts/teman-nyatet/src/components/BottomSheetNav.tsx`
  - `artifacts/teman-nyatet/src/components/DraggableSheet.tsx`

**Interfaces:**
- Consumes existing motion and gesture components.
- Produces compositor-friendly movement and reduced unnecessary rerenders
  without changing gesture thresholds or action semantics.

- [ ] **Step 1: Add a shared reduced-motion signal**

Create a small hook only if the project has no existing equivalent:

```ts
export function usePrefersReducedMotion(): boolean
```

Use `matchMedia('(prefers-reduced-motion: reduce)')`, subscribe to changes,
and clean up the listener. Keep the hook browser-safe for the initial render.

- [ ] **Step 2: Apply reduced motion at route transitions**

In `RouteSlot`, skip the route enter translation when reduced motion is
enabled, while keeping the page visible and focus/navigation behavior intact.

- [ ] **Step 3: Remove broad layout work from frequent list updates**

Replace `transition-all` or large layout animations on swipeable rows, todo
rows, and note-grid entry/exit states only where profiling or code inspection
shows they affect frequent interaction. Use targeted transitions:

```tsx
className="transition-[background-color,border-color,box-shadow] ..."
```

Keep transform/opacity for movement and preserve drag overlay animation.

- [ ] **Step 4: Stabilize memoized row props**

Ensure row components receive stable callbacks and primitive/ stable values.
Do not pass freshly created objects when an existing primitive prop is enough.
Do not change dnd-kit sensor activation constraints.

- [ ] **Step 5: Verify interaction behavior**

Run the typecheck and diff checks. In preview, exercise:

1. note card tap and drag reorder;
2. todo toggle and drag;
3. link swipe-to-delete;
4. bottom-sheet open/close and form submission;
5. route navigation with reduced motion enabled in browser settings.

Expected: all actions still work, movement remains responsive, and reduced
motion removes nonessential movement rather than hiding content.

### Task 5: Harden PWA caching and update behavior

Status: complete after generated service-worker audit; no PWA configuration
change was needed because private API caching is already excluded.

**Files:**
- Modify: `artifacts/teman-nyatet/vite.config.ts`
- Modify: `artifacts/teman-nyatet/src/main.tsx`
- Inspect: `artifacts/teman-nyatet/src/components/PwaUpdatePrompt.tsx`
- Inspect: `artifacts/teman-nyatet/src/components/OfflineIndicator.tsx`
- Inspect: `artifacts/teman-nyatet/public/manifest.json`

**Interfaces:**
- Consumes the existing Workbox prompt strategy and UI events.
- Produces an offline-capable static shell without private API caching and
  without disruptive update reloads.

- [ ] **Step 1: Audit generated service-worker routes**

Build the app and inspect the generated service worker:

```bash
pnpm --filter @workspace/teman-nyatet run build
rg -n "api|navigateFallback|CacheFirst|NetworkFirst|StaleWhileRevalidate" artifacts/teman-nyatet/dist/sw.js
```

Confirm API paths are denied from navigation fallback and no user-data runtime
cache is configured.

- [ ] **Step 2: Keep static caching focused**

Use precache for built JS/CSS/index assets. Add runtime caching only for
public static resources such as fonts or images when the origin and privacy
behavior are explicit. Never add `/api/` to a cache handler.

- [ ] **Step 3: Verify update prompt timing**

Confirm `onNeedRefresh` only emits the existing update event and that the
prompt does not reload while a form is open or user work is in progress. If
the component has no such guard, add a non-disruptive user-controlled update
action rather than forcing reload.

- [ ] **Step 4: Verify manifest and offline shell**

Check that `start_url`, `scope`, icons, theme color, and standalone display
remain valid. Test the production preview by loading the app once, disabling
the network, and confirming the static shell still opens; document that
private API-backed data is unavailable offline unless already present in the
client cache.

- [ ] **Step 5: Run production and type checks**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck
git diff --check
```

Restart the frontend workflow after configuration changes and inspect logs.

### Task 6: Final cross-device verification and documentation

Status: complete for preview/build verification; real-device FPS measurement
remains outside this environment.

**Files:**
- Modify: `docs/superpowers/performance-baseline.md`
- Create: `docs/superpowers/performance-verification.md`

**Interfaces:**
- Consumes the baseline from Task 1 and all implementation outputs.
- Produces a factual verification record, including known limits of preview
  performance measurements.

- [ ] **Step 1: Run the complete validation set**

Run:

```bash
pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck
pnpm --filter @workspace/teman-nyatet run build
git diff --check
```

- [ ] **Step 2: Verify representative viewports**

Capture the running app at mobile portrait, mobile landscape, tablet, and
desktop sizes. Check login, each authenticated route, bottom navigation,
settings, bottom sheets, modal forms, and safe-area clearance.

- [ ] **Step 3: Verify route/data interactions**

Check:

- cached return navigation does not show an unnecessary blank state;
- search/filter remains responsive;
- create/edit/delete mutations still work;
- drag, swipe, and bottom-sheet gestures remain available;
- browser console contains no new errors.

- [ ] **Step 4: Write the verification record**

Document commands, build output summary, routes checked, browser console
result, service-worker behavior, and any device-only checks that remain.
Separate measured facts from expected benefits.

- [ ] **Step 5: Update durable project memory only if needed**

If implementation reveals a non-obvious environment constraint or durable
performance rule not discoverable from code, add a concise pointer to
`.agents/memory/MEMORY.md` and put details in a topic file. Do not record
implementation changelog details.