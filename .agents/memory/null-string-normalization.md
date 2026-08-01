---
name: Null string normalization
description: Empty optional note fields must not be coerced into literal "null" values.
---

Optional text fields need explicit normalization before persistence. Never use `String(value)` for nullable fields because `String(null)` becomes the user-visible text `"null"`.

**Why:** A blank note title was stored as `"null"` in the PostgreSQL-primary path, while the Sheets path represented it as empty, creating inconsistent UI behavior.

**How to apply:** Normalize nullable text values to `''` or `null` according to the schema before repository writes, and add a regression test for `null`, `undefined`, empty, and non-empty inputs.