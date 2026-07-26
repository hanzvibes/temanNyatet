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
