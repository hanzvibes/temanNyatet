# Application Performance Optimization Design

## Goal

Improve cold and warm startup, FCP, LCP, TTI, runtime responsiveness, animation/scrolling smoothness, and bundle size across the existing TemanNyatet frontend and API server without changing features, routes, UI appearance, or user-visible behavior.

## Constraints

- Keep the existing pnpm workspace, React/Vite frontend, Express API, Supabase auth, and Google Sheets data architecture.
- Do not migrate dependencies, databases, or deployment targets.
- Do not add required external services or invent environment values.
- Preserve auth, API security, caching semantics, routing, PWA behavior, and all current interaction flows.
- Prefer targeted changes that can be validated with the existing build and typecheck commands.

## Design

### Frontend critical path

Keep the synchronous startup path limited to theme bootstrap, Supabase/API token wiring, the application shell, and the active route. Continue route-level lazy loading. Defer noncritical service-worker registration and optional UI work until after the first paint/idle period.

### Frontend bundle and runtime

Use production-only bundle inspection to identify large or duplicated chunks. Refine Rollup chunk boundaries around feature-only dependencies so charts, drag-and-drop, and other optional libraries are not part of the initial route payload. Preserve the existing cached route behavior for fast back-navigation, while avoiding eager work for inactive features and preventing duplicate subscriptions or listeners.

### API server

Keep the Express API startup behavior and security middleware intact. Reduce avoidable synchronous startup work and keep optional integration work lazy where this does not alter request behavior. Ensure responses that are safe to cache or compress are handled efficiently without caching authenticated/user-specific data incorrectly.

### Verification

- Record production build output and compare generated asset sizes before and after changes.
- Run workspace typechecking and production builds.
- Restart both configured workflows after changes.
- Check workflow logs and browser console output.
- Capture the frontend preview and smoke-test API health.
- Confirm no required environment variable values are exposed or changed.

## Alternatives considered

1. **Conservative, measurement-led optimization (chosen):** lowest regression risk and best fit for the no-behavior-change constraint.
2. **Aggressive bundle surgery:** potentially smaller initial payload, but higher chunk-request and navigation complexity.
3. **Architecture rewrite:** unnecessary risk for this goal and explicitly out of scope.

## Error handling and compatibility

Existing errors, auth redirects, API responses, PWA update flow, and route fallbacks remain authoritative. Performance changes must fail open to the current behavior rather than silently dropping work.

## Testing strategy

Use the existing typecheck/build commands as the baseline. Add focused regression checks only for newly extracted performance helpers or changed startup behavior if the repository has a suitable test runner; otherwise validate those paths through deterministic build output and runtime smoke tests.