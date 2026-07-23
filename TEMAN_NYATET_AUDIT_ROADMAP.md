# TemanNyatet — Cross-Functional Audit & Roadmap

**Scope:** Entire codebase (frontend, API server, migrations, infra, docs).  
**Evidence date:** 2026-07-23 (current project state).  
**Goal:** Only recommend improvements justified by the current code — no speculative features.

---

## How to read this document

Each item has:

- **Title** — short, actionable name
- **Why it matters** — business/user/technical justification tied to the code
- **Expected impact** — concrete outcome if implemented
- **Difficulty** — Easy / Medium / Hard
- **Priority** — Critical / High / Medium / Low
- **Recommended approach** — how to implement, with file references

---

# 🐞 Bugs

## B1. Payment wall bypass: anyone can activate their own subscription
- **Why it matters:** `PaymentPage.tsx` calls `supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', user.id)` from the client. The profile RLS policy allows users to update their own row, so this effectively makes payment optional. This breaks the business model if Mayar integration is real.
- **Expected impact:** Closes a revenue loophole. Restores payment integrity.
- **Difficulty:** Easy
- **Priority:** Critical
- **Recommended approach:**
  - Remove the "Lewati untuk sekarang" button and `handleSkip` from `PaymentPage.tsx` (lines 15–33 and 82–88).
  - Add a server-side-only activation path: `subscription.ts` or `webhook.ts` already exists for Mayar webhooks.
  - Harden the RLS policy so `authenticated` role cannot update `subscription_status` directly; only `service_role` (via the API server) may do so.
  - File references: `artifacts/teman-nyatet/src/pages/PaymentPage.tsx`, `supabase/migrations/fix_profiles_rls_recursion.sql`.

## B2. Silent data loss on long-press delete in Keuangan & Link Saver
- **Why it matters:** `KeuanganPage.tsx` (lines 150–163) and `LinkSaverPage.tsx` (lines 85–99) delete transactions/links immediately after an 800 ms long-press with no confirmation dialog. Notes and To-do use a detail sheet with an explicit delete button, which is safer. Accidental deletions are irreversible from the user's perspective (only the backend archives to `_Archive`).
- **Expected impact:** Prevents accidental deletion. Matches the safer pattern used in Catatan and Todo.
- **Difficulty:** Easy
- **Priority:** Critical
- **Recommended approach:**
  - Replace long-press delete with tap-to-open detail sheet + explicit delete button (reuse the pattern from `CatatanPage.tsx` lines 124–132 / `TodoPage.tsx` lines 131–134).
  - Or add a confirmation dialog using the existing shadcn/ui `AlertDialog`.
  - Files: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`, `artifacts/teman-nyatet/src/pages/LinkSaverPage.tsx`.

## B3. `listByUser` reads every row then filters in memory
- **Why it matters:** `sheet-store.ts` line 223–233 fetches the entire sheet (`A2:End`) and filters by `user_id` in memory. Since each user has their own private spreadsheet, this is currently fine (one user per sheet), but if the design ever shifts to multi-user sheets or the user accumulates thousands of rows, latency and memory will degrade. More importantly, it is a latent bug that is hard to diagnose later.
- **Expected impact:** Avoids future performance cliff. Makes the code robust to large datasets.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Since the architecture is per-user spreadsheet, the filter is redundant. Remove it and trust the per-user sheet boundary, OR
  - Add explicit pagination/capping, OR
  - If multi-user sheets are planned, use a single-query `A2:End` filter via Google Sheets API query language or filter views.
  - File: `artifacts/api-server/src/lib/sheet-store.ts` lines 223–233.

## B4. Transaction module is missing update in the UI
- **Why it matters:** The API server supports `PUT /transactions/:id` (`transactions.ts` lines 61–88), but `useTransactions.ts` does not expose `updateTransaction`, and `KeuanganPage.tsx` does not offer an edit flow. Users cannot fix a typo in amount or category.
- **Expected impact:** Feature parity with Catatan and Todo. Better data quality.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Add `updateTransaction` to `useTransactions.ts` (follow `useNotes.ts` lines 80–91).
  - Add an edit detail sheet in `KeuanganPage.tsx` reusing the existing create form, populated with the selected transaction.

## B5. Link module is missing update in the UI
- **Why it matters:** Same pattern as B4: `PUT /links/:id` exists (`links.ts` lines 48–72), but `useLinks.ts` has no `updateLink` and `LinkSaverPage.tsx` has no edit UI. Users must delete and recreate a link to change its title or note.
- **Expected impact:** Feature parity and fewer accidental deletions.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Add `updateLink` to `useLinks.ts`.
  - Add an edit sheet/button in `LinkSaverPage.tsx` (already uses a detail sheet for copy — extend it).

## B6. Multiple `002_*` migration files create ordering risk
- **Why it matters:** `supabase/migrations/` has `002_add_avatar_url.sql`, `002_add_profile_fields.sql`, and `002_add_spreadsheet_id.sql`. Supabase migrations run in filename order, and three files with the same prefix can run in an arbitrary order depending on filesystem sort. This causes schema drift or errors.
- **Expected impact:** Prevents migration failures in new environments. Makes setup reproducible.
- **Difficulty:** Easy
- **Priority:** High
- **Recommended approach:**
  - Rename into a strict sequence: `001`, `002`, `003`, `004`, `005`, `006`, `007` (or use timestamps).
  - Consolidate the three `002_*` files into a single `002_add_profile_columns.sql` since they all add columns.
  - Update `supabase/migrations/README.md` to reference the corrected order.

## B7. `fix_profiles_rls_recursion.sql` is not part of the documented setup
- **Why it matters:** The RLS recursion bug is what blocked login in the first place. The fix file lives in the repo but is not mentioned in `README.md` or `supabase/migrations/README.md`, so new deployments will hit the same bug.
- **Expected impact:** New developers/environments will not get stuck at login.
- **Difficulty:** Easy
- **Priority:** Critical
- **Recommended approach:**
  - Promote the script to a numbered migration (e.g., `003_fix_rls_recursion.sql`) so it runs automatically in the documented order.
  - Remove or deprecate `005_phase1_schema.sql` which also drops/re-creates policies and conflicts with the fix.
  - Update `README.md` and `supabase/migrations/README.md` with the new migration order.

## B8. `AuthPage.tsx` uses the wrong form type for login
- **Why it matters:** The form is typed as `RegisterFormValues` even when logging in (line 31). It works because the resolver is switched, but it is fragile and could break if the schemas diverge (e.g., adding a required field to register only).
- **Expected impact:** Prevents a future regression. Cleaner code.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Use `LoginFormValues` for the form state when `isLogin === true`, or split into two separate forms.
  - File: `artifacts/teman-nyatet/src/pages/AuthPage.tsx`.

## B9. `connect-sheet` silently swallows API errors
- **Why it matters:** `ConnectSheetPage.tsx` `loadStatus` (lines 80–89) catches errors and ignores them. If the API is down, the user sees a "Not Connected" state and keeps clicking Connect, which will fail. No feedback is shown.
- **Expected impact:** Users understand why they cannot connect. Fewer confused clicks.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Show a toast or inline error when `loadStatus` fails, and disable the CTA while the true status is unknown.
  - File: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`.

## B10. `AuthGuard` spreadsheet-error listener can navigate repeatedly
- **Why it matters:** `App.tsx` lines 40–49 dispatches `setLocation` on every `spreadsheet-error` event without checking if the user is already on `/connect-sheet`. Multiple rapid errors could cause navigation thrashing or history pollution.
- **Expected impact:** Stops navigation loops and repeated redirects.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add a guard: if `location` is already `/connect-sheet`, return early. Also debounce or dedupe events in the listener.
  - File: `artifacts/teman-nyatet/src/App.tsx`.

---

# 🔒 Security

## S1. Enforce subscription changes on the server only
- **Why it matters:** Same evidence as B1. The client can write `subscription_status = 'active'`, which is a privilege escalation.
- **Expected impact:** Prevents unpaid activation. Protects revenue.
- **Difficulty:** Easy
- **Priority:** Critical
- **Recommended approach:**
  - Remove `GRANT UPDATE` on `subscription_status` from authenticated role.
  - Add a Supabase row-level security policy that only `service_role` (or a specific function) can update `subscription_status`.
  - Files: `supabase/migrations/fix_profiles_rls_recursion.sql`, `artifacts/teman-nyatet/src/pages/PaymentPage.tsx`.

## S2. Add server-side input validation on notes content length
- **Why it matters:** `notes.ts` allows `CONTENT_MAX = 50_000` (line 10). Google Sheets has a hard 50,000-character cell limit, but the current `requireString` in `validate.ts` does not cleanly reject oversize strings; it throws a generic error. Also, a 50 KB note is a DoS vector for mobile users and Google API quotas.
- **Expected impact:** Prevents save failures and quota abuse.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Lower `CONTENT_MAX` to a reasonable limit (e.g., 10,000 chars) or validate and reject with a clear 400 message.
  - Add a character counter in the note form.
  - Files: `artifacts/api-server/src/routes/notes.ts`, `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`.

## S3. Add rate limiting for the Mayar webhook endpoint
- **Why it matters:** `webhook.ts` has a signature check but no explicit rate limiting. If the Mayar signing secret leaks or is guessed, an attacker could spam the endpoint and consume resources.
- **Expected impact:** Reduces abuse risk.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add a stricter `express-rate-limit` instance specifically for `/api/mayar-webhook` in `app.ts` or `webhook.ts` (e.g., 10 req/min per IP).
  - File: `artifacts/api-server/src/app.ts` or `artifacts/api-server/src/routes/webhook.ts`.

## S4. Harden the OAuth callback error handling
- **Why it matters:** `auth-google.ts` line 129 catches all callback errors and redirects with `?error=OAUTH_FAILED`. This hides the real error from users but also makes debugging hard. It also returns a 302 redirect on what may be a 500-class failure, which some monitoring tools miss.
- **Expected impact:** Better incident response and clearer user messaging.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Log the full error with a correlation ID. Return distinct error codes for token exchange failures, Drive failures, and spreadsheet init failures.
  - File: `artifacts/api-server/src/routes/auth-google.ts`.

## S5. Review `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` env vars
- **Why it matters:** `.env.example` still lists these, but the architecture now uses per-user OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`). Leaving them in the example file creates confusion and risk of accidental service-account fallback.
- **Expected impact:** Cleaner secrets. No dead code paths.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Remove `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` from `.env.example` and anywhere they are still read.
  - Confirm no code references them. If none, delete them. If some exist, decide whether to migrate or remove that path.
  - Files: `artifacts/api-server/.env.example`, full codebase grep.

---

# ✨ UX Improvements

## U1. Persist pending verification email across page reloads
- **Why it matters:** `AuthPage.tsx` shows a "Verifikasi Email Diperlukan" screen after signup, but `pendingEmail` is React state. A refresh resets it to the login form. Users may not know what to do next.
- **Expected impact:** Fewer support requests. Smoother onboarding.
- **Difficulty:** Easy
- **Priority:** High
- **Recommended approach:**
  - Store `pendingEmail` in `sessionStorage` or `localStorage` on signup, and read it on mount. Clear it after successful login.
  - File: `artifacts/teman-nyatet/src/pages/AuthPage.tsx`.

## U2. Replace the 1200 ms hardcoded OAuth wait with polling
- **Why it matters:** `ConnectSheetPage.tsx` lines 104–110 wait 1.2 seconds after OAuth before refreshing the profile. This is guesswork and can feel stuck or too short.
- **Expected impact:** Faster perceived connection. Fewer users stuck on success overlay.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Poll `refreshProfile()` every 500 ms until `profile.spreadsheet_id` is set, with a timeout (e.g., 10 s) and an error fallback.
  - File: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`.

## U3. Add a clearer "developer-only" label to the redirect URI box
- **Why it matters:** The redirect URI copy box in `ConnectSheetPage.tsx` is useful for setup but confusing for end users. The current copy says "Pastikan URI di atas persis sama..." which is technical jargon.
- **Expected impact:** Less end-user confusion during onboarding.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Collapse the section by default with a "Tampilkan pengaturan teknis" toggle, or only show it when the user has already seen an OAuth error.
  - File: `artifacts/teman-nyatet/src/pages/ConnectSheetPage.tsx`.

## U4. Make the payment redirect feel like an in-app transition
- **Why it matters:** `PaymentPage.tsx` uses plain `<a>` links to `VITE_MAYAR_PAYMENT_URL`. In a PWA this opens the browser, breaking immersion. There is also no "loading" state before the redirect.
- **Expected impact:** Higher conversion completion. Better PWA feel.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add a clickable card with a `processing` state, then use `window.open(..., '_blank')` or `window.location.href` with a spinner overlay. Reuse the existing button style (primary yellow).
  - File: `artifacts/teman-nyatet/src/pages/PaymentPage.tsx`.

## U5. Add empty-state CTAs
- **Why it matters:** Current empty states are good copy + icon, but they do not include a button to create the first item. Users on large screens must find the floating button or bottom sheet.
- **Expected impact:** Faster first action. Better conversion.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add a primary CTA button inside each empty state (`CatatanPage.tsx`, `KeuanganPage.tsx`, `TodoPage.tsx`, `LinkSaverPage.tsx`) that opens the create form.

## U6. Add pull-to-refresh on mobile lists
- **Why it matters:** Data is loaded once and then polled every 15 seconds. Users may want to force a refresh after creating a transaction on another device.
- **Expected impact:** Better control and perceived freshness.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Add a `usePullToRefresh` hook or use a library. Trigger a refetch in the respective data hook.

## U7. Add keyboard shortcuts and focus traps for desktop forms
- **Why it matters:** The create/edit sheets use `vaul`. On desktop, focus management and Escape-to-close are not guaranteed. Power users expect keyboard navigation.
- **Expected impact:** Better desktop accessibility.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Ensure all `Drawer.Root` instances have `onOpenChange`, auto-focus first input, and close on Escape. Add a reusable `SheetForm` wrapper.
  - Files: `SheetFormContent.tsx`, `BottomSheetNav.tsx`, `CatatanPage.tsx`, `KeuanganPage.tsx`, `TodoPage.tsx`, `LinkSaverPage.tsx`.

---

# 🎨 UI Improvements

## UI1. Unify the "floating" brand yellow into the theme system
- **Why it matters:** `AuthPage.tsx` uses hardcoded `#F4C753` and `#4A3D18`. Other pages use `bg-primary`, `text-primary`, etc. The yellow is inconsistent with the Tailwind theme tokens, which makes dark mode and future re-branding harder.
- **Expected impact:** Easier theming, consistent visual identity, simpler maintenance.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Define the brand yellow as `primary` in the CSS theme variables (`index.css`) and replace hardcoded colors with `bg-primary`, `text-primary-foreground`, etc.
  - Files: `artifacts/teman-nyatet/src/index.css`, `artifacts/teman-nyatet/src/pages/AuthPage.tsx`, and other hardcoded occurrences.

## UI2. Remove or consolidate the legacy `BottomNav.tsx`
- **Why it matters:** Both `BottomNav.tsx` and `BottomSheetNav.tsx` exist. `BottomSheetNav.tsx` is the one used. The dead file adds confusion and maintenance cost.
- **Expected impact:** Cleaner component tree. No accidental edits to the wrong file.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Delete `BottomNav.tsx` if it is truly unused. If it is a desktop variant, rename it and make the usage explicit.
  - File: `artifacts/teman-nyatet/src/components/BottomNav.tsx`.

## UI3. Standardize list item spacing and padding across modules
- **Why it matters:** Each module has slightly different header spacing and list padding. For example, `CatatanPage.tsx` and `KeuanganPage.tsx` both use `px-6 lg:px-10 max-w-screen-xl mx-auto`, but the bottom sheet collapse and footer padding vary. This is a subtle polish issue.
- **Expected impact:** More premium, cohesive feel.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Create a `PageShell` layout component that wraps all four module pages with consistent header, content, bottom sheet, and empty-state slots.
  - Files: new `PageShell.tsx`, then update the four module pages.

## UI4. Add a skeleton placeholder for the bottom sheet nav on first load
- **Why it matters:** The bottom sheet renders only after the module loads, but on slow networks the nav bar can pop in after the content, causing layout shift.
- **Expected impact:** Less cumulative layout shift. Better perceived performance.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Render a fixed-height placeholder with the same rounded pill shape while the JS chunk is loading.
  - File: `artifacts/teman-nyatet/src/App.tsx` / `MainLayout`.

---

# 🚀 Features

## F1. Edit transactions
- **Why it matters:** `PUT /transactions/:id` is already implemented on the backend but not exposed in the UI. This is a parity gap, not a new idea.
- **Expected impact:** Users can fix mistakes without delete/recreate.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Add `updateTransaction` to `useTransactions.ts`.
  - Add an edit sheet to `KeuanganPage.tsx`.
  - Reuse `txSchema` and form fields.
  - See B4 for files.

## F2. Edit links
- **Why it matters:** Same as F1. Backend supports update; UI does not.
- **Expected impact:** Feature parity.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Add `updateLink` to `useLinks.ts`.
  - Add an edit sheet in `LinkSaverPage.tsx`.
  - See B5.

## F3. Export notes/transactions/todos/links to CSV
- **Why it matters:** Data lives in the user's own Google Sheet, but the app does not expose a one-click export. Since all data is already in the user's Drive, a simple export feature reinforces the "your data" value proposition.
- **Expected impact:** Trust-building. Useful for backups and accounting.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Add `GET /api/:module/export` endpoints that stream CSV from the sheet-store data, or generate CSV in the frontend from the existing list responses.
  - Add an export button in each module's settings menu or header.

## F4. Bulk delete / archive for notes, todos, links, transactions
- **Why it matters:** Current delete is one-by-one. For long-time users, cleaning up old data is tedious.
- **Expected impact:** Faster housekeeping.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Add selection mode in each list, then `POST /api/:module/bulk-delete` that archives each row.

## F5. Link metadata auto-fetch (title + favicon)
- **Why it matters:** `LinkSaverPage.tsx` requires the user to type the title manually. The code already fetches a favicon from Google's S2 service. Fetching the page title via a small backend proxy would reduce friction.
- **Expected impact:** Faster link saving. Less manual input.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Add a backend endpoint `POST /api/links/preview` that fetches the page HTML and extracts `<title>`. Use a strict timeout (e.g., 5 s) and URL allowlist to avoid abuse.
  - Autofill the title in the create form.

## F6. Recurring transactions / todos
- **Why it matters:** Finance and todo modules are natural places for recurring items (monthly bills, daily tasks). Not currently supported.
- **Expected impact:** Higher retention. More use cases covered.
- **Difficulty:** Hard
- **Priority:** Low
- **Recommended approach:**
  - Add a `recurrence` column to the schema. Use a cron job to generate the next occurrence. This is a large change; only do after the foundation bugs are fixed.

## F7. Full-text search across all modules
- **Why it matters:** Each module already has its own `SearchBar` and client-side filtering. A global search (especially across notes and links) would be valuable.
- **Expected impact:** Faster information retrieval.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Add a search index endpoint or client-side combined search in the UI.

---

# ⚡ Performance

## P1. Remove per-user sheet connection cache or make it refresh-aware
- **Why it matters:** `user-sheet.ts` caches the connection for 60 seconds. If the user reconnects Google during that window, the old cached `connection` (possibly with a revoked token) is still used, causing 503 errors until the cache expires.
- **Expected impact:** Faster recovery after reconnect. Fewer stale errors.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Invalidate the cache on `disconnect` (already done in `auth-google.ts`) and immediately after successful OAuth callback. Also add cache-busting on any `GOOGLE_TOKEN_INVALID` error.
  - File: `artifacts/api-server/src/lib/user-sheet.ts`.

## P2. Add request-level caching headers and ETag for GET endpoints
- **Why it matters:** `GET /notes`, `/transactions`, etc. are called every 15 seconds. Google Sheets is the slow part, but the responses could also be conditionally cached for the API's own egress/compute.
- **Expected impact:** Lower Google API quota usage. Faster perceived load.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Add short-lived cache headers (e.g., 10 s) for GET requests. Use the user's last sync timestamp as an ETag. This is only safe after P1 fixes the stale-connection issue.

## P3. Bundle-size audit of the API server
- **Why it matters:** `build.mjs` bundles the API server but leaves `googleapis`, `express`, and many others as external. The resulting `dist/index.mjs` is 2.8 MB. Vercel installs dependencies anyway, so the externalization may not help. Bundling only application code and externalizing everything else could reduce cold-start size.
- **Expected impact:** Faster cold starts on Vercel.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Measure the actual deployed function size. If externalization is not reducing it, remove the `external` list and let esbuild bundle the application tree, or mark only native dependencies as external.
  - File: `artifacts/api-server/build.mjs`.

## P4. Reduce re-renders in data hooks
- **Why it matters:** `useNotes`, `useTransactions`, etc. poll every 15 seconds and store full arrays. If the data is large, the list re-renders even when unchanged. React Query is already used, but the custom hooks may not use structural sharing.
- **Expected impact:** Smoother UI on low-end devices.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Move polling to React Query (already imported) with `useQuery` and `refetchInterval`, instead of custom `useEffect` + `setInterval`.
  - Files: `useNotes.ts`, `useTransactions.ts`, `useTodos.ts`, `useLinks.ts`.

## P5. Lazy-load the bottom sheet below-the-fold components
- **Why it matters:** `SheetFormContent.tsx` is part of the `BottomSheetNav` chunk, but the create form for the active module is only needed when the user opens the sheet. Other modules' forms are never needed on the same page.
- **Expected impact:** Smaller initial JS bundle.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Split `SheetFormContent` into per-module chunks and load them on demand.

---

# 📱 Mobile Experience

## M1. Fix bottom sheet height on landscape phones
- **Why it matters:** `BottomSheetNav.tsx` calculates `expanded: screenH * 0.88`. On landscape phones with 400 px height, the expanded sheet leaves almost no room for the form content. The handle/collapsed state also covers 96 px of content.
- **Expected impact:** Forms are usable in landscape. Less content hidden behind the nav.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Use `dvh` units or `window.visualViewport` height. Cap the expanded sheet at a max height that leaves the header visible. Add a safe-area padding for the bottom nav.
  - File: `artifacts/teman-nyatet/src/components/BottomSheetNav.tsx`.

## M2. Add safe-area-inset support for bottom nav
- **Why it matters:** The floating bottom nav has `fixed bottom-5` but no `env(safe-area-inset-bottom)` handling. On iPhones with a home indicator, the nav may be too close to the edge or be obscured.
- **Expected impact:** Better iOS PWA experience.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add `pb-[env(safe-area-inset-bottom)]` or a Tailwind arbitrary value. Ensure the page has `pb-32` adjusted for safe area.
  - Files: `BottomSheetNav.tsx`, `App.tsx`, module pages.

## M3. Haptic feedback on destructive actions
- **Why it matters:** The current deletion patterns (long-press or tap) give no physical feedback. On mobile, haptics make the "sat-set" UX feel more responsive and reduce accidental deletions.
- **Expected impact:** Better tactile UX.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Use `navigator.vibrate?.(50)` on long-press start and success. Wrap in a feature check.

## M4. Add a back gesture / back button for detail sheets
- **Why it matters:** The detail/edit sheets in `CatatanPage.tsx` and `TodoPage.tsx` are full-height on mobile. If the user swipes back from the edge, the browser navigates back, losing context.
- **Expected impact:** Fewer accidental exits. Better mobile ergonomics.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Add a swipe-to-close gesture inside sheets or use `vaul`'s native snap points. Ensure the visible back button is always reachable.

## M5. Optimize the offline indicator for PWA
- **Why it matters:** `OfflineIndicator.tsx` shows a banner. But the app does not queue mutations for retry when offline. A user who creates a note offline will get an error.
- **Expected impact:** Better offline reliability. True PWA resilience.
- **Difficulty:** Hard
- **Priority:** Low
- **Recommended approach:**
  - Add a background sync queue using IndexedDB + service worker. Out of scope until core bugs are fixed.

---

# 🛠 Infrastructure

## I1. Align pnpm version across root package.json and README
- **Why it matters:** `package.json` says `pnpm@10.26.1`; `README.md` says `pnpm@10.34.3`. This mismatch confuses CI/CD and Vercel's package-manager detection.
- **Expected impact:** Reproducible builds. Fewer "works on my machine" issues.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Pick the version that actually works with the `catalog:` protocol and `minimumReleaseAge`, then update both files.
  - Files: `package.json`, `README.md`.

## I2. Review `minimumReleaseAge` in `pnpm-workspace.yaml`
- **Why it matters:** The workspace enforces a 24-hour `minimumReleaseAge`. If a security patch is released and needs immediate deployment, this rule blocks it.
- **Expected impact:** Faster security updates. Less CI friction.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Reduce `minimumReleaseAge` to a few hours, or add a CI override flag. Document the policy in `README.md`.
  - File: `pnpm-workspace.yaml`.

## I3. Add health checks and structured logging for Vercel
- **Why it matters:** `health.ts` exists but only returns `{ ok: true }`. It does not verify Supabase connectivity, Google OAuth readiness, or secret presence. In production, an unhealthy deployment could still return 200.
- **Expected impact:** Better uptime detection. Faster incident response.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Extend `health.ts` to check Supabase, Google token metadata, and required env vars. Use non-sensitive status indicators. Keep the response fast (< 1 s).
  - File: `artifacts/api-server/src/routes/health.ts`.

## I4. Add deployment documentation for Replit → Vercel
- **Why it matters:** The project is designed for two Vercel deployments, but the setup steps are scattered. A new contributor must piece together frontend, API, Supabase, and Google Cloud Console steps.
- **Expected impact:** Faster onboarding. Fewer misconfigured deployments.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Create a `DEPLOYMENT.md` with exact Vercel project settings, env var lists, Supabase redirect URLs, and Google Cloud Console redirect URI setup. Link it from `README.md`.

## I5. Add automated smoke tests for the API server
- **Why it matters:** Currently there are no tests. The API has many routes and subtle error handling. A regression in `sheet-store.ts` or `requireAuth.ts` could break all four modules.
- **Expected impact:** Fewer regressions. Safer refactors.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Add `vitest` or `jest` to the API server. Start with tests for `validate.ts`, `google-oauth.ts`, and `requireAuth.ts` (mocking Supabase).

## I6. Set up a migration runner and rollback strategy
- **Why it matters:** Migrations are manual. The `fix_profiles_rls_recursion.sql` script was added ad hoc. There is no clear "source of truth" for the production schema.
- **Expected impact:** Production schema drift prevented. New environments reproducible.
- **Difficulty:** Medium
- **Priority:** High
- **Recommended approach:**
  - Consolidate all migrations into a single ordered sequence (see B6, B7).
  - Document the migration order in `supabase/migrations/README.md`.
  - Consider using `supabase db push` or `lib/db/drizzle` consistently.

## I7. Add production monitoring for Google API errors
- **Why it matters:** Google API errors are classified but not aggregated. A spike in `GOOGLE_TOKEN_INVALID` or `SPREADSHEET_ACCESS_DENIED` could indicate an OAuth issue or a Sheets API outage.
- **Expected impact:** Proactive incident response.
- **Difficulty:** Hard
- **Priority:** Low
- **Recommended approach:**
  - Add a lightweight metrics counter or structured log fields for error codes. Forward logs to an observability tool (only if already chosen; do not invent a new dependency).

---

# 📚 Documentation

## D1. Rewrite `README.md` data architecture section
- **Why it matters:** `README.md` line 40 still says "State: React Context (auth) + useState/useEffect (feature data via Supabase directly)" and line 175 says all notes live in Google Sheets. The two statements contradict. The memory file confirms the project switched to per-user OAuth Google Sheets, but the main docs are stale.
- **Expected impact:** New developers understand the actual architecture immediately.
- **Difficulty:** Easy
- **Priority:** High
- **Recommended approach:**
  - Rewrite the "Stack" and "Where things live" sections to state: Supabase for auth + profile, API server for Google Sheets data, per-user OAuth.
  - File: `README.md`.

## D2. Document the `lib/db` Drizzle decision
- **Why it matters:** `lib/db` exists with a Drizzle config, but `README.md` says to run migrations manually via Supabase SQL Editor. This is confusing.
- **Expected impact:** Clearer contribution path.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Either remove `lib/db` if unused, or document when to use it vs. manual SQL migrations. Do not leave orphaned tooling.
  - File: `lib/db/README.md` or `README.md`.

## D3. Document the `VITE_API_SERVER_URL` usage
- **Why it matters:** `apiClient.ts` uses it, but the frontend `.env.example` does not list it (it is commented out). This causes confusion when deploying frontend and API separately.
- **Expected impact:** Fewer deployment misconfigurations.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add `VITE_API_SERVER_URL` to `artifacts/teman-nyatet/.env.example` with a clear comment explaining when to set it.
  - File: `artifacts/teman-nyatet/.env.example`.

## D4. Add inline comments for the timezone workaround
- **Why it matters:** `KeuanganPage.tsx` and `TodoPage.tsx` append `T12:00:00` to date strings. The comment is good, but the pattern is repeated. A single helper with a docstring would be clearer.
- **Expected impact:** Easier maintenance. Fewer bugs when adding new date fields.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Create `lib/localDate.ts` with a `parseLocalDate` helper. Replace all `dateStr + 'T12:00:00'` occurrences.
  - Files: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`, `artifacts/teman-nyatet/src/pages/TodoPage.tsx`, new `lib/localDate.ts`.

---

# 🧪 Testing

## T1. Add unit tests for `validate.ts`
- **Why it matters:** `requireString`, `requireEnum`, `requireHttpUrl`, and `optionalTags` are security-critical but untested. A regression here would affect all data modules.
- **Expected impact:** Confidence in input validation. Safer refactors.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Add `vitest` to `artifacts/api-server`. Test edge cases: empty strings, max length, XSS URLs, invalid enums, malformed tags.
  - File: `artifacts/api-server/src/lib/validate.test.ts`.

## T2. Add integration tests for `sheet-store.ts` with a mocked Google client
- **Why it matters:** All data modules depend on `sheet-store.ts`. Testing it with a mock `sheets_v4.Sheets` client would catch serialization/row-order bugs without hitting Google API.
- **Expected impact:** Faster feedback loop. Fewer production bugs.
- **Difficulty:** Hard
- **Priority:** Medium
- **Recommended approach:**
  - Create a test helper that builds a mock `sheets` object with `get`, `append`, `batchUpdate`, etc. Run `createRow`, `updateRow`, `deleteRow`, `listByUser` and assert row shapes and archive behavior.
  - File: `artifacts/api-server/src/lib/sheet-store.test.ts`.

## T3. Add E2E tests for the critical user journey
- **Why it matters:** The current setup relies on manual verification. A login → connect Google → payment → create note/todo/transaction/link flow is the highest-value test.
- **Expected impact:** Catches regressions in the user funnel before deploy.
- **Difficulty:** Hard
- **Priority:** Medium
- **Recommended approach:**
  - Use Playwright. Mock the Google OAuth callback and Mayar webhook. Run the critical path in CI.
  - File: new `tests/e2e/` directory.

## T4. Add type-level tests for the API contract
- **Why it matters:** `lib/api-spec/openapi.yaml` and `orval.config.ts` exist but there is no check that the server and client stay in sync. `apiClient.ts` returns `body.data` casted as `T`, which is unsafe.
- **Expected impact:** Fewer API/frontend contract mismatches.
- **Difficulty:** Medium
- **Priority:** Low
- **Recommended approach:**
  - Generate `orval` hooks from OpenAPI and verify the generated types match the actual route responses. Or add a type test using `tRPC`/`openapi-fetch` if a migration is acceptable.

---

# 🧹 Code Quality

## Q1. Remove the dead `BottomNav.tsx` component
- **Why it matters:** It is not imported anywhere. Keeping it invites edits to the wrong file.
- **Expected impact:** Cleaner codebase.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Confirm zero references with grep, then delete.
  - File: `artifacts/teman-nyatet/src/components/BottomNav.tsx`.

## Q2. Consolidate duplicated `verifyToken` logic
- **Why it matters:** `subscription.ts` re-implements token verification (lines 12–28) instead of using `requireUser` from `middleware/requireAuth.ts`. This is a maintenance risk.
- **Expected impact:** Single source of truth. Consistent unverified-email rejection.
- **Difficulty:** Easy
- **Priority:** Medium
- **Recommended approach:**
  - Replace the custom `verifyToken` in `subscription.ts` with `requireUser` middleware.
  - File: `artifacts/api-server/src/routes/subscription.ts`.

## Q3. Add a reusable `PageShell` for module pages
- **Why it matters:** All four module pages repeat the same header, search, list, empty state, and bottom padding patterns. The duplication makes global changes error-prone.
- **Expected impact:** Less duplication. Easier future modules.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Create `PageShell.tsx` with header, search, content, and empty-state slots. Refactor the four module pages to use it.
  - See UI3 for related improvement.

## Q4. Extract hardcoded brand colors to theme tokens
- **Why it matters:** Same as UI1. Hardcoded yellow appears in `AuthPage.tsx`, `PaymentPage.tsx` (subtle), and module-specific icons. Theme tokens are the correct home.
- **Expected impact:** Consistent design system. Easier re-branding.
- **Difficulty:** Medium
- **Priority:** Medium
- **Recommended approach:**
  - Define `primary` as the brand yellow in `index.css` and replace hardcoded values. Use Tailwind arbitrary values only for accents that are truly one-off.
  - Files: `index.css`, `AuthPage.tsx`, `PaymentPage.tsx`, `KeuanganPage.tsx`.

## Q5. Add explicit return types to route handlers
- **Why it matters:** Express route handlers currently infer `Promise<void>` or `void`. Explicit return types and early-return discipline would prevent accidental `res.json` after `res.status`.
- **Expected impact:** Fewer runtime response errors.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Add `RequestHandler` return types or a custom `ApiHandler` wrapper. Enforce with ESLint.

## Q6. Add lint rules to prevent `console` in production code
- **Why it matters:** Several files use `console.warn`/`console.error`. `logger.ts` is already configured. Using the logger consistently ensures structured logs in production.
- **Expected impact:** Cleaner production logs. Better observability.
- **Difficulty:** Easy
- **Priority:** Low
- **Recommended approach:**
  - Add an ESLint rule or a simple `pnpm lint` step that flags `console.*` and suggests `logger`.

---

# Prioritized Roadmap

## 1. Quick Wins (do first — high impact, low effort)

1. **B7** — Promote RLS fix to a numbered migration and remove conflicting migration. (Critical, Easy)
2. **B1 / S1** — Remove payment skip button; harden `subscription_status` RLS. (Critical, Easy)
3. **B2** — Add confirmation dialog / detail sheet before deleting transactions and links. (Critical, Easy)
4. **D1** — Rewrite `README.md` architecture section to match the current Google Sheets OAuth design. (High, Easy)
5. **B6** — Rename and consolidate the three `002_*` migration files. (High, Easy)
6. **U1** — Persist pending verification email in `sessionStorage`. (High, Easy)
7. **B9** — Show an error when Google connection status fails to load. (Medium, Easy)
8. **B8** — Fix `AuthPage` form type. (Medium, Easy)
9. **D3** — Add `VITE_API_SERVER_URL` to frontend `.env.example`. (Medium, Easy)
10. **I1** — Align pnpm version in `package.json` and `README.md`. (Medium, Easy)

## 2. High Impact Improvements (1–2 sprints)

1. **B4 / F1** — Add edit transaction UI and hook. (High, Medium)
2. **B5 / F2** — Add edit link UI and hook. (High, Medium)
3. **B3** — Fix `listByUser` to not read the entire sheet when unnecessary. (High, Medium)
4. **S2** — Add server-side content length validation and UI character counter. (Medium, Easy)
5. **S3** — Add rate limiting to Mayar webhook. (Medium, Easy)
6. **I3** — Extend health check to verify Supabase and Google readiness. (Medium, Medium)
7. **I6** — Consolidate migration strategy and document it. (High, Medium)
8. **U2** — Poll profile status instead of hardcoded 1.2 s wait after OAuth. (Medium, Medium)
9. **M1 / M2** — Improve bottom sheet height and safe-area handling on mobile. (Medium, Medium)
10. **Q3 / UI3** — Build a reusable `PageShell` and standardize module layouts. (Medium, Medium)

## 3. Long-Term Enhancements (3+ sprints)

1. **F3** — Export data to CSV/PDF. (Medium, Medium)
2. **F5** — Auto-fetch link title and metadata. (Medium, Medium)
3. **T2** — Integration tests for `sheet-store.ts` with mocked Google client. (Medium, Hard)
4. **T3** — E2E tests for the full user journey. (High, Hard)
5. **P4** — Migrate data hooks to React Query with proper structural sharing. (Medium, Medium)
6. **S4** — Improve OAuth callback error logging and user-facing error codes. (Medium, Easy)
7. **I4** — Full deployment guide (`DEPLOYMENT.md`). (Medium, Medium)
8. **S5** — Remove dead service-account env vars from docs. (Medium, Easy)

## 4. Nice-to-Have Ideas

1. **F4** — Bulk delete / archive. (Low, Medium)
2. **F6** — Recurring transactions / todos. (Low, Hard)
3. **F7** — Global search across modules. (Low, Medium)
4. **M5** — Offline mutation queue. (Low, Hard)
5. **I7** — Production metrics for Google API errors. (Low, Hard)
6. **M3** — Haptic feedback on mobile. (Low, Easy)
7. **M4** — Swipe-to-close detail sheets. (Low, Medium)
8. **Q6** — Lint rule against `console.*`. (Low, Easy)

---

# Bottom line

The most important work is not new features — it is closing the **critical bugs and documentation gaps** that can break onboarding, revenue, and user trust. Do the Quick Wins first, especially the payment bypass, the destructive-delete UX, the RLS migration, and the README rewrite. After that, the biggest user-facing improvements are **edit transactions** and **edit links**, which are already half-implemented on the backend.
