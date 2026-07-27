---
name: production API build artifacts
description: The API build needs different logging artifacts in development and production.
---

# Production API build artifacts

## Rule

Keep Pino pretty-print workers and linked source maps available for local development, but omit both from production API builds.

**Why:** Development workflows benefit from readable logs and source locations, while production deployments do not need those files and pay extra build/output cost for them.

**How to apply:** Gate the API bundler’s logger plugin and source-map generation on `NODE_ENV === "production"`. Validate both modes independently because the development workflow depends on the pretty logger output.