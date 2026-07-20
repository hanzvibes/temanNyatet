---
name: google-auth-library version conflict
description: Two versions of google-auth-library (10.5.0 + 10.9.0) cause TypeScript type errors in the googleapis integration.
---

# google-auth-library Version Conflict

## Rule
When creating Sheets/Drive clients from OAuth2 tokens, use `as any` cast when passing the auth client to `google.sheets()` / `google.drive()`.

**Why:** pnpm resolves two versions of `google-auth-library` (googleapis bundles 10.5.0; standalone package is 10.9.0). TypeScript sees them as distinct types, causing "separate declarations of a private property 'redirectUri'" errors.

## How to apply
- `google-oauth.ts` has `as any` cast on auth client passed to `google.sheets()` and `google.drive()`
- `pnpm-workspace.yaml` overrides `google-auth-library` to `^10.9.0` to minimize divergence
- Do NOT remove the `as any` casts — they are required

## Symptoms if this regresses
```
error TS2769: No overload matches this call.
  Type 'OAuth2Client' is not assignable to type '...OAuth2Client'.
  Types have separate declarations of a private property 'redirectUri'.
```
