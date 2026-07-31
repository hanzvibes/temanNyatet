---
name: Supabase PostgREST schema cache
description: Recovery when a newly applied Supabase function exists or was migrated but REST RPC discovery still returns PGRST202.
---

After applying a Supabase migration that creates or replaces an RPC, PostgREST may
temporarily retain an older schema cache. A REST call can show the new table while
returning `PGRST202` for the function.

**Why:** The application calls RPCs through Supabase REST, so database DDL and
PostgREST's exposed schema can become observable at different times.

**How to apply:** Verify the function in the Supabase SQL editor using
`pg_proc`/`pg_namespace`, then run `NOTIFY pgrst, 'reload schema';` and retry the
RPC after a short delay. If the function query returns no row, the function
portion of the migration did not apply and must be rerun before testing the app.