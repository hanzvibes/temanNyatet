# TemanNyatet Performance Baseline

## Build

- Command: `pnpm --filter @workspace/teman-nyatet run build`
- Date: 2026-07-29
- Build result: passed; Vite 7.3.5, 3123 modules transformed, 7.69s
- Largest JS assets:
  - `vendor`: 473.82 kB (147.61 kB gzip)
  - `supabase`: 204.78 kB (53.37 kB gzip)
  - `motion`: 67.60 kB (22.11 kB gzip)
  - `dnd`: 49.45 kB (16.40 kB gzip)
  - `query`: 24.60 kB (7.40 kB gzip)
- CSS: 169.25 kB (25.26 kB gzip)
- PWA precache: 32 entries, 1202.26 KiB

## Runtime

- Preview route: `/`
- Production build output: `dist/public`
- Service-worker registration: deferred with `requestIdleCallback` (or a
  one-second timeout fallback), after the React root mounts.
- Build warning: sourcemap could not resolve the original location in
  `src/components/ui/sonner.tsx`; build still completed successfully.
- Installed-PWA FPS: not measured in this preview baseline; requires a real
  mobile-device benchmark.

## Interaction checklist

- Route navigation: not measured in this baseline.
- Search: not measured in this baseline.
- Swipe: not measured in this baseline.
- Drag-and-drop: not measured in this baseline.
- Bottom sheet: not measured in this baseline.
- Query-backed return navigation: existing architecture keeps active routes
  unmounted and retains React Query cache.