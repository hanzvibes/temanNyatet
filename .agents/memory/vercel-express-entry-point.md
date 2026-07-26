---
name: Vercel Express Entry Point Pattern
description: How the api-server's src/index.ts must be structured to work both on Vercel serverless and on Replit/local self-hosted Node.
---

## Rule

Vercel's `@vercel/node` builder (selected automatically when Framework Preset = Express, Build Command = None) wraps the **default export** of the entry TypeScript file as a per-request serverless handler. It does **not** start a long-running HTTP listener.

When the same Express app also needs to run as a self-hosted Node process (Replit workflows, `pnpm dev`, plain `node`), gate the `app.listen()` call on the Vercel runtime check and `export default app`:

```ts
const isVercel = process.env["VERCEL"] === "1";

if (!isVercel) {
  app.listen(port, (err) => { /* ... */ });
}

export default app;
```

## Why

- Vercel sets `VERCEL=1` in the build/runtime environment. Use it (or `process.env.AWS_LAMBDA_FUNCTION_NAME`, but VERCEL is simpler) as the serverless-mode signal.
- `app.listen(port)` blocks on `bind()` — in serverless there is no port to bind, so it fails fast (EADDRINUSE) or stalls until the function times out, producing 504s at the Vercel router.
- `@vercel/node` accepts an Express app as the default export and synthesizes `(req, res) => app(req, res)` per invocation; no extra ceremony required.
- A single entry file keeps `pnpm dev` (build → start) and `vercel deploy` (auto-detect) honest; the conditional is the only divergence.

## How to apply

- Whenever touching `artifacts/api-server/src/index.ts`, preserve the `isVercel` gate + `export default app` — reverting either makes the api-server un-deployable to Vercel.
- If splitting the entry (e.g. into `api/` for Vercel Functions), mirror the gate so both entry points see the same Express app construction.
- Do **not** move `app.listen()` into a separate bootstrap file without also redirecting `pnpm dev` / `pnpm start` to invoke it — otherwise local dev silently regresses.

---

## CJS-UMD imports under Vercel's tsc check

Vercel's post-build type-check pass on the api-server resolves CJS-UMD hybrid packages (those shipping both `index.d.cts` with `export = X` and `index.d.mts` with `export { X as default }`) differently from local `tsc --noEmit`. Even with `esModuleInterop: true` in the artifact's `tsconfig.json`, the default-import form:

```ts
import helmet from "helmet";       // TS2349 on Vercel, OK locally
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
```

…resolves to the namespace object — TS reports `Type 'typeof import("helmet")' has no call signatures`. Local tsc accepts it; Vercel's does not.

The bulletproof shape works identically on both tsc invocations:

```ts
import * as helmetMod from "helmet";
import * as rateLimitMod from "express-rate-limit";
import * as pinoHttpMod from "pino-http";

const helmet = ((helmetMod as any).default ?? helmetMod) as any;
const rateLimit = ((rateLimitMod as any).default ?? rateLimitMod) as any;
const pinoHttp = ((pinoHttpMod as any).default ?? pinoHttpMod) as any;
```

`as any` (not `as (opts?: Parameters<typeof mod.default>[0]) => unknown`) is intentional: `Parameters<typeof mod.default>` preserves the dual-overload chain (e.g. `pinoHttp`'s `(DestinationStream) => Handler | (Options) => Handler`), so TS picks the wrong overload against the `{ logger, serializers }` object literal and reports `TS2353 'logger' does not exist in type 'DestinationStream'`. Collapsing to `any` skips overload resolution entirely.

**Why:** The current offenders are `helmet@8.3.0`, `express-rate-limit@8.5.2`, `pino-http@10.5.0`. Any future CJS-UMD dep should follow the same pattern unless Vercel relaxes the module-shape check. `@vercel/node` builder does not surface this; it is the **standalone tsc check** Vercel runs after install.

**How to apply:** When importing a third-party CJS-UMD hybrid into `artifacts/api-server/src/**`, do not use `import X from "X"` — use the namespace + `.default ?? mod` + `as any` triple. Treat local tsc green as necessary-but-not-sufficient; always reason about whether Vercel's stricter resolver could see it differently.

---

## Cascading `noImplicitAny` on `as any` middleware callbacks

When the namespace-import + `as any` pattern is applied to a middleware factory like `rateLimit`, `multer`, or `pinoHttp`, downstream options-callbacks lose their parameter types:

```ts
const rateLimit = ((rateLimitMod as any).default ?? rateLimitMod) as any;
const limiter = rateLimit({
  keyGenerator(req) { … },   // ← req: any (implicit) — TS7006
  skip(req) { … },
  handler(_req, res) { … },
});
```

`noImplicitAny: true` (set in `tsconfig.base.json`) then rejects each callback parameter. And `try { … } catch (err)` chains fall under `useUnknownInCatchVariables: true` — even inside `if (err instanceof X.MulterError)`, the narrowing fails when `X` is `any`.

**How to apply:**

- For `keyGenerator(req)`, `skip(req)`, `handler(_req, res)` callbacks on `as any` middleware configs: add an explicit `: any` annotation to every parameter.
- For `catch (err)` blocks that touch `instanceof` against an `as any` module's class: type the binding explicitly as `catch (err: any)` rather than relying on narrowing. Keep this scoped to error-handling sites — don't widen other catches.

The pattern in `artifacts/api-server/src/middleware/requireAuth.ts` (line 47 onward) and `artifacts/api-server/src/routes/profile.ts` (line 99 onward) is the reference shape.
