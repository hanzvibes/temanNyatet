---
name: Workspace typecheck order
description: The pnpm monorepo's package checks depend on built declarations from shared libraries.
---

Run the shared library build before validating an individual artifact or the full workspace typecheck. A fresh checkout can report missing declaration outputs for `@workspace/api-client-react` even when the application code is valid.

**Why:** The frontend package references generated declaration files from the internal API client, and those files are not guaranteed to exist after import or install.

**How to apply:** Use `pnpm run typecheck:libs` before `pnpm --filter @workspace/teman-nyatet run typecheck` or `pnpm run typecheck`.