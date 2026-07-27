# Performance Baseline — 2026-07-27

## Environment

- Workspace: pnpm `10.26.1`
- Frontend: `@workspace/teman-nyatet`
- API: `@workspace/api-server`
- Dependencies installed from the existing frozen lockfile.
- No secret values are included in this report.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/teman-nyatet run build
pnpm --filter @workspace/api-server run build
```

## Results before optimization

- Workspace typecheck: passed.
- Frontend production build: passed in 7.88s.
- API production build: passed in 381ms.
- Initial frontend JavaScript entry: 70.23 kB.
- Initial frontend vendor chunk: 495.65 kB.
- Initial frontend Supabase chunk: 204.78 kB.
- Frontend CSS: 148.71 kB.
- API bundled server entry: 2.7 MB.
- API generated source map: 4.3 MB.

The frontend build emitted source-map location warnings for two existing UI files (`sonner.tsx` and `tooltip.tsx`), but the build completed successfully. The API build emitted separate Pino worker/pretty-print artifacts.

## Initial observations

- `index.html` modulepreloads the vendor, Supabase, query, Radix, date-fns, and motion chunks before a route is known.
- The API build uses `esbuild-plugin-pino` with `pino-pretty` transports, which accounts for additional logger worker artifacts in the generated output.
- No FCP, LCP, or TTI lab measurements are claimed here; those require a browser performance harness beyond the repository’s current scripts.