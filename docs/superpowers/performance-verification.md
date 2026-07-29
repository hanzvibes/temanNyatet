# TemanNyatet Performance Verification

## Code and build checks

- `pnpm run typecheck:libs && pnpm -r --filter "./artifacts/**" --if-present run typecheck`
  - Passed for API server and frontend.
- `pnpm --filter @workspace/teman-nyatet run build`
  - Passed.
  - Vite transformed 3124 modules in 7.46s on the verification run.
- `git diff --check`
  - Passed.

The build still reports an existing sourcemap warning for
`src/components/ui/sonner.tsx`:

> Can't resolve original location of error.

It does not fail the build and is unrelated to the performance changes.

## Bundle and PWA output

- Route-level chunks remain in place.
- Existing vendor boundaries remain unchanged because the baseline already had
  stable chunks for Supabase, Query, motion, dnd-kit, date-fns, Radix, and
  route pages.
- Generated service worker precaches built JS/CSS/index assets.
- Service-worker navigation fallback explicitly excludes `/api/`.
- No private API or spreadsheet response was added to runtime caching.
- Service-worker registration remains deferred until browser idle time.

## Implemented performance changes

- Added a browser-safe `usePrefersReducedMotion` hook.
- Route enter motion now becomes immediate when reduced motion is requested.
- Frequent todo card state changes use targeted transitions instead of
  `transition-all`.
- Search input visual transitions are limited to border, shadow, and background
  properties.
- Existing active-route-only rendering and React Query cache retention remain
  intact.

## Preview smoke checks

- Frontend workflow remains running after HMR updates.
- API workflow remains running.
- Browser logs show Vite HMR updates and no new runtime exceptions.
- The login shell renders in the preview.

## Device benchmark boundary

Preview/build verification confirms code-level startup and rendering behavior,
but does not prove consistent 60 FPS on an installed PWA. A real mobile-device
benchmark is still required for startup time, route navigation, scrolling,
swipe, drag-and-drop, bottom sheets, dropped frames, long tasks, and memory
growth.