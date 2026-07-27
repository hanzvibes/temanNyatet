# Performance Optimization Results — 2026-07-27

## Scope

Optimized the existing frontend and API build/runtime paths without changing routes, features, UI appearance, authentication behavior, or API contracts.

## Changes

- Deferred service-worker registration until browser idle time, with a four-second timeout fallback.
- Lazy-loaded authenticated navigation (`SidebarNav` and `BottomSheetNav`) so the login/onboarding path does not include their code in the initial entry.
- Lazy-loaded the global toaster and removed the redundant app-level tooltip provider; the sidebar retains its own tooltip provider where it is used.
- Kept feature-only chunks isolated for date formatting, drag-and-drop, charts, and motion.
- Made API production builds omit development-only Pino pretty-print workers and linked source maps. Development builds retain readable pretty logs and source maps.

## Measurements

| Metric | Before | After |
|---|---:|---:|
| Frontend build duration | 7.88s | 6.93s |
| Frontend entry JS | 70.23 kB | 16.37 kB |
| Frontend vendor chunk | 495.65 kB | 472.77 kB |
| Frontend CSS | 148.71 kB | 148.71 kB |
| API production output | 2.7 MB + workers/maps | 2.78 MB single file |
| API production source maps/workers | present | omitted |

The production API bundle’s main file is slightly larger than the previous bundled entry because the previous measurement included a concurrent development build that overwrote the output directory; the reliable comparison is the removal of the additional worker and source-map artifacts from production output.

## Verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm run typecheck`: passed.
- `pnpm --filter @workspace/teman-nyatet run build`: passed.
- `NODE_ENV=production pnpm --filter @workspace/api-server run build`: passed.
- Both configured Replit workflows restarted and remained running.
- Frontend screenshot at `/`: existing login screen rendered correctly.
- Browser console: no application errors; the expected non-secure-origin PWA registration warning appeared in the local preview.
- API smoke check: `GET http://127.0.0.1:8080/api/healthz` returned `{"status":"ok"}`.

## Limits

FCP, LCP, TTI, and 60 FPS scrolling were not assigned numeric lab measurements because the repository has no browser performance harness. The build and runtime changes reduce critical-path work, but production Lighthouse or WebPageTest runs should be used for those user-centric metrics.