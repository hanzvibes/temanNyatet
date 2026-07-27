# Application Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce startup cost, runtime overhead, and production asset size across the TemanNyatet frontend and API server without changing features or UI behavior.

**Architecture:** Keep the existing pnpm workspace and service boundaries. Measure a production frontend build, then optimize the browser critical path and Vite chunk graph, followed by targeted Express startup/response improvements that preserve auth and security middleware. Validate with typechecking, production builds, workflow restarts, browser/API smoke checks, and asset-size comparison.

**Tech Stack:** React 19, Vite 7, TypeScript, TanStack Query, vite-plugin-pwa, Express 5, esbuild, pnpm 10.

## Global Constraints

- Keep the existing pnpm workspace, React/Vite frontend, Express API, Supabase auth, and Google Sheets data architecture.
- Do not migrate dependencies, databases, or deployment targets.
- Do not add required external services or invent environment values.
- Preserve auth, API security, caching semantics, routing, PWA behavior, and all current interaction flows.
- Prefer targeted changes that can be validated with the existing build and typecheck commands.

---

### Task 1: Install workspace dependencies and capture a build baseline

**Files:**
- Read: `package.json`, `pnpm-lock.yaml`, `artifacts/teman-nyatet/package.json`
- Create: `docs/superpowers/baselines/2026-07-27-performance-baseline.md`

**Interfaces:**
- Consumes: existing lockfile and package scripts.
- Produces: reproducible dependency installation and recorded frontend/API build measurements.

- [ ] **Step 1: Install the locked workspace dependencies**

Run the repository’s pnpm installation through the environment package-management workflow, preserving the lockfile and package versions.

- [ ] **Step 2: Run the existing typecheck before edits**

Run:

```bash
pnpm run typecheck
```

Record any pre-existing failures separately from optimization regressions.

- [ ] **Step 3: Build the frontend and API before edits**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
pnpm --filter @workspace/api-server run build
```

Record build duration, generated asset names, and byte sizes with:

```bash
find artifacts/teman-nyatet/dist/public -type f -printf '%s %p\n' | sort -nr
stat -c '%s %n' artifacts/api-server/dist/index.mjs artifacts/api-server/dist/index.mjs.map
```

- [ ] **Step 4: Write the baseline document**

Include the commands, environment caveats, pass/fail results, and exact asset-size output. Do not expose secret values.

- [ ] **Step 5: Commit the baseline**

```bash
git add docs/superpowers/baselines/2026-07-27-performance-baseline.md
git commit -m "perf: capture application performance baseline"
```

### Task 2: Reduce frontend critical-path work

**Files:**
- Modify: `artifacts/teman-nyatet/src/main.tsx`
- Modify: `artifacts/teman-nyatet/src/App.tsx`
- Read: `artifacts/teman-nyatet/src/components/PwaInstallPrompt.tsx`
- Read: `artifacts/teman-nyatet/src/components/PwaUpdatePrompt.tsx`
- Read: `artifacts/teman-nyatet/src/contexts/AuthContext.tsx`

**Interfaces:**
- Consumes: current app bootstrap, lazy route table, PWA registration, and auth context behavior.
- Produces: identical rendered states and navigation behavior with less work before first paint and fewer avoidable rerenders/listeners.

- [ ] **Step 1: Write a failing regression check for deferred startup work**

If no test runner exists, add a small pure helper test only if the repository already has a compatible runner; otherwise use a deterministic source-level/build check that asserts the startup module does not synchronously invoke service-worker registration and that the initial app render remains before deferred registration.

The check must fail against the current ordering if it tests a new extracted helper; do not add production code before confirming the check detects the intended ordering.

- [ ] **Step 2: Extract only the minimal scheduling helper**

Create a focused helper under `artifacts/teman-nyatet/src/lib/` for scheduling noncritical work after the first render using `requestIdleCallback` with a timeout and a `setTimeout` fallback. Preserve browser compatibility and make cancellation possible on teardown.

- [ ] **Step 3: Use the helper for service-worker registration**

Update `main.tsx` so React mounts before service-worker registration and registration is scheduled with an idle timeout. Preserve secure-origin checks, update callbacks, and error logging.

- [ ] **Step 4: Reduce shell work without changing visible behavior**

Review `App.tsx` and the prompt components for effects that can be scoped to authenticated/active states or mounted once. Apply only changes that preserve route caching, auth redirects, overlay events, and prompt behavior.

- [ ] **Step 5: Run the focused check and workspace typecheck**

Run the relevant test/check command and:

```bash
pnpm run typecheck
```

Expected: the focused check passes and no new TypeScript errors appear.

- [ ] **Step 6: Commit the critical-path changes**

```bash
git add artifacts/teman-nyatet/src/main.tsx artifacts/teman-nyatet/src/App.tsx artifacts/teman-nyatet/src/lib
git commit -m "perf: defer noncritical frontend startup work"
```

### Task 3: Optimize the frontend production chunk graph

**Files:**
- Modify: `artifacts/teman-nyatet/vite.config.ts`
- Read: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`
- Read: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`
- Read: `artifacts/teman-nyatet/src/pages/TodoPage.tsx`

**Interfaces:**
- Consumes: route-level lazy imports and current Vite/Rollup settings.
- Produces: smaller critical chunks with cache-stable feature chunks and unchanged public routes/assets.

- [ ] **Step 1: Build the current frontend and inspect chunk ownership**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run build
```

Use generated asset names and source imports to identify dependencies still included in the initial route or duplicated across chunks.

- [ ] **Step 2: Add a failing build assertion for the intended split**

Use a shell assertion against the build manifest/output that fails if chart and drag-and-drop dependencies are present in the critical entry chunk. Keep the assertion limited to the invariant being optimized, not fragile hashed filenames.

- [ ] **Step 3: Adjust manual chunks and production-only build settings**

Refine `manualChunks` only where the measured graph justifies it. Keep route-only dependencies isolated and avoid splitting React into a circular chunk. Enable minification/source-map behavior appropriate for production without changing runtime URLs or preview behavior.

- [ ] **Step 4: Rebuild and verify the chunk assertion**

Run the build and assertion. Compare total initial JS bytes and largest chunks against Task 1. If total bytes worsen or the build introduces circular-chunk warnings, revert the specific chunk change and keep the safer baseline.

- [ ] **Step 5: Run typecheck and commit**

```bash
pnpm run typecheck
git add artifacts/teman-nyatet/vite.config.ts
git commit -m "perf: refine frontend production chunks"
```

### Task 4: Reduce API cold-start and response overhead safely

**Files:**
- Modify: `artifacts/api-server/src/app.ts`
- Modify: `artifacts/api-server/src/index.ts` only if measurement identifies avoidable startup work
- Modify: `artifacts/api-server/build.mjs` only if the generated bundle measurement justifies it
- Read: `artifacts/api-server/src/routes/health.ts`
- Read: `artifacts/api-server/src/routes/index.ts`

**Interfaces:**
- Consumes: existing Express middleware order, route registration, logger, and serverless export contract.
- Produces: same API routes/security behavior with less unnecessary work per request and no Vercel/Replit startup regression.

- [ ] **Step 1: Write a failing regression check for health behavior**

Add or use a compatible API check that asserts `GET /api/healthz` remains successful, has the same JSON contract, and does not require user authentication. Run it before implementation so it fails only if the new test setup is incorrect, then correct the test setup until it exercises the real app.

- [ ] **Step 2: Implement only measured low-risk changes**

Preserve raw-body webhook ordering, JSON limits, CORS, Helmet, rate limiting, pino logging, and route order. Apply targeted improvements such as immutable cache headers for the unauthenticated health response or lazy initialization only when they do not affect authenticated/user-specific responses.

- [ ] **Step 3: Run API checks and build**

Run:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
```

Verify the generated server bundle remains runnable and `GET /api/healthz` returns the existing response.

- [ ] **Step 4: Commit the API changes**

```bash
git add artifacts/api-server/src artifacts/api-server/build.mjs
git commit -m "perf: reduce API request overhead"
```

### Task 5: Verify end-to-end behavior and document run instructions

**Files:**
- Modify: `replit.md` if absent; otherwise preserve the existing project documentation location and update only the relevant run/performance notes
- Create: `docs/superpowers/results/2026-07-27-performance-results.md`

**Interfaces:**
- Consumes: optimized frontend/API builds and configured workflows.
- Produces: verified running services, before/after measurements, and concise operational notes.

- [ ] **Step 1: Run full typecheck and production builds**

```bash
pnpm run typecheck
pnpm --filter @workspace/teman-nyatet run build
pnpm --filter @workspace/api-server run build
```

- [ ] **Step 2: Restart both configured workflows**

Restart `artifacts/teman-nyatet: web` and `artifacts/api-server: API Server`. Check workflow logs for startup errors and unexpected warnings.

- [ ] **Step 3: Smoke-test the running services**

Check the frontend preview at `/`, capture a screenshot, inspect browser console output, and request the API health endpoint through its configured port. Confirm the login shell renders, route lazy loading works, and no UI/feature behavior changed.

- [ ] **Step 4: Compare and record results**

Record build duration, initial JS/CSS bytes, total output bytes, API bundle bytes, and any runtime observations. Explicitly note limits: lab FCP/LCP/TTI values require a browser performance harness and should not be claimed from build output alone.

- [ ] **Step 5: Update run documentation and commit**

Document the existing commands, required environment variables, workflow names, and the measurement methodology without exposing secrets.

```bash
git add replit.md docs/superpowers/results/2026-07-27-performance-results.md
git commit -m "docs: record performance optimization results"
```