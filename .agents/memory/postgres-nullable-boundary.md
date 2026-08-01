---
name: PostgreSQL nullable API boundary
description: TemanNyatet app-data tables use NOT NULL text defaults while API payloads expose nullable optional fields.
---

When an API field is nullable but its PostgreSQL column is `NOT NULL`, normalize `null` and `undefined` to the schema's empty-value representation before writes, then normalize empty stored values back to API `null` on reads.

**Why:** A live CRUD regression exposed that passing API `null` directly to a `NOT NULL` transaction note column fails at runtime even though TypeScript types and route validation pass.

**How to apply:** Check the actual database nullability during migration audits; keep the conversion at the repository boundary so the Sheets fallback and public API contract remain unchanged.