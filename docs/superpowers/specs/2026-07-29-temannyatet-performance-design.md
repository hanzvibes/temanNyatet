# TemanNyatet Performance & Native-App Feel

## Goal

Make TemanNyatet feel fast and native across mobile PWA, desktop web, and
slower network conditions by reducing startup work, avoiding unnecessary
renders and requests, keeping gestures smooth, and making offline behavior
reliable.

The work is intentionally incremental: each optimization must preserve the
existing authentication flow, Google Sheets-backed data behavior, route
semantics, bottom navigation, bottom sheets, swipe interactions, and
drag-and-drop interactions.

## Success criteria

- The first visible app shell is not delayed by service-worker registration,
  non-active routes, or secondary UI.
- Returning to a recently visited route paints from the existing query cache
  without a blank loading state whenever cached data is available.
- Scrolling, swipe gestures, drag-and-drop, and bottom-sheet movement use
  compositor-friendly properties and avoid avoidable layout work.
- Repeated navigation and PWA resume do not trigger unnecessary refetches or
  duplicate subscriptions.
- Production bundles are split so route/vendor caching is effective, and the
  production build remains valid.
- The app remains usable on a slow connection and in an installed PWA after
  service-worker updates.
- Reduced-motion users receive a functional, less animated experience.

## Design

### 1. Startup and bundle delivery

- Keep route-level lazy loading and active-route-only rendering.
- Audit the production build output and adjust manual chunks only where they
  improve cacheability without creating a large blocking vendor chunk.
- Keep auth/onboarding code separate from authenticated feature pages where
  practical.
- Do not load heavy feature-only dependencies before the route or interaction
  that needs them.
- Keep the initial app shell lightweight: secondary prompts, update UI,
  toaster UI, and non-critical navigation can remain deferred.
- Keep service-worker registration deferred until idle, and ensure it does not
  block first paint or initial auth rendering.

### 2. Query and network behavior

- Preserve the current React Query policy of retaining cache across route
  unmounts and disabling noisy focus refetches.
- Audit feature hooks for duplicate requests, unstable query keys, and
  requests that happen before the route can render useful cached content.
- Prefer cached data plus background refresh over blank loading states.
- Cancel or ignore obsolete requests when a route, search term, or filter is
  replaced.
- Avoid changing API semantics or spreadsheet synchronization behavior as part
  of this performance work.

### 3. Render and list performance

- Keep expensive pages unmounted when inactive.
- Preserve memoized note, to-do, transaction, and link row components.
- Stabilize callbacks and derived collections where they currently cause
  avoidable child renders.
- Avoid broad `transition-all` and layout animations on frequently updated
  rows; use `transform`, `opacity`, and targeted visual properties.
- Consider list virtualization only if profiling shows list size is a real
  bottleneck; do not add complexity preemptively for normal list sizes.

### 4. Native-feeling interaction and motion

- Keep gesture feedback immediate and use transform/opacity for movement.
- Reduce or remove layout animation from large grids and long lists.
- Use consistent short transitions for route changes, cards, dialogs, and
  bottom sheets.
- Add a global reduced-motion policy that disables non-essential movement while
  preserving state changes and focus visibility.
- Avoid expensive blur and shadow combinations on frequently moving elements.
- Preserve minimum touch targets and safe-area behavior.

### 5. PWA and offline behavior

- Keep built static assets precached and API routes excluded from navigation
  fallback.
- Review runtime caching so static font/image resources can be reused without
  causing stale application HTML or stale user data.
- Keep API data network-controlled; do not cache private spreadsheet responses
  in the service worker without an explicit privacy-safe design.
- Keep update prompts non-blocking and avoid forcing a reload during active
  user work.
- Verify installed-PWA startup and offline shell behavior separately from the
  development preview.

## Verification

For each implementation slice:

1. Run the workspace typecheck in the required library-first order.
2. Run the relevant production build and inspect generated bundle sizes.
3. Run `git diff --check`.
4. Restart the relevant workflow after build/toolchain changes and inspect
   workflow and browser logs.
5. Capture the running app at a representative route and viewport.
6. Check that auth, route navigation, query-backed pages, bottom navigation,
   bottom sheets, swipe, and drag-and-drop remain available.

Performance claims about installed-PWA smoothness require a real device or
mobile benchmark; preview verification alone only confirms startup and
rendering correctness.

## Out of scope

- Replacing React, React Query, Vite, or the existing API/data architecture.
- Replacing Google Sheets as the application data backend.
- Redesigning page content or changing product behavior unrelated to speed and
  native-feeling interaction.
- Adding speculative virtualization or a new state-management layer without
  profiling evidence.
- Service-worker caching of private API responses.