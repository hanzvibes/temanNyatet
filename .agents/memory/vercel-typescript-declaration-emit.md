---
name: Vercel TypeScript declaration emit
description: API declaration emit can fail on inferred Express routers and lazy Google OAuth types even when noEmit typecheck passes.
---

Vercel's post-build TypeScript declaration emit may report a source file such as
`postgres-repository.ts` as "Emit skipped" even though the actual errors are
non-portable inferred types in unrelated Express routers or lazy OAuth helpers.

**Why:** pnpm workspace dependency paths can leak into inferred declaration
types, while the normal API typecheck and esbuild bundle do not emit those
declarations.

**How to apply:** Give exported router constants an explicit `IRouter` type and
keep lazy third-party clients out of public inferred return types. Reproduce
with `tsc -p artifacts/api-server/tsconfig.json --declaration
--emitDeclarationOnly` before declaring the Vercel build fixed.