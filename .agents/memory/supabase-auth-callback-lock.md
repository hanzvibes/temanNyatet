---
name: Supabase auth callback lock
description: Supabase auth callbacks must not await nested Supabase operations.
---

Supabase `onAuthStateChange` callbacks must return synchronously; defer profile
queries or sign-out calls until after the callback returns. Awaiting another
Supabase operation inside the callback can hold the internal auth lock and leave
the app's auth loading state stuck indefinitely.

**Why:** Sign-in and session restoration can deadlock on slower browsers when the
callback awaits `profiles` queries or `auth.signOut()`.

**How to apply:** Keep the callback limited to state flags and schedule async
profile/session work with a macrotask (or equivalent outside the callback lock).