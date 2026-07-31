---
name: Public legal route auth boundary
description: Public privacy and terms pages must render independently from session loading and account onboarding redirects.
---

Public legal pages are intentionally outside the authentication readiness boundary: they must render while session checks are pending and must not be redirected by spreadsheet, payment, or subscription onboarding state.

**Why:** Google OAuth review and unauthenticated users need reliable access to the policies even when Supabase is slow, unavailable, or a signed-in account is incomplete.

**How to apply:** When adding or changing public compliance pages, keep their paths in both the public route policy and the early-render exception, while preserving normal auth guards for product pages.