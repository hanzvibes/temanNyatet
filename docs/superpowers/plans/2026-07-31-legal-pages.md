# TemanNyatet Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public, Google-review-friendly Privacy Policy and Terms of Service pages to TemanNyatet, linked from login and accessible without authentication.

**Architecture:** Create one reusable `LegalPage` presentation component that receives a policy type and renders the appropriate Indonesian content, metadata, navigation, and semantic sections. Register `/privacy-policy` and `/terms-of-service` as lazy-loaded route entries and include both routes in the unauthenticated allowlist. Add visible cross-links and login links without changing any authentication or API behavior.

**Tech Stack:** React, TypeScript, Wouter, Tailwind CSS v4 tokens, Lucide React, Vite.

## Global Constraints

- Both legal routes must be accessible without a Supabase session.
- Use the official contact email `rhn.rmdhniii@gmail.com`.
- Explain TemanNyatet's notes, finance, to-do, link saver, and per-user Google Sheets/Drive OAuth flows accurately.
- Do not claim absolute security or that TemanNyatet is an official Google service.
- Do not change database schema, OAuth scopes, secrets, or API routes.
- Preserve the existing light/dark theme and mobile-first app visual language.
- Verify with frontend typecheck, frontend build, workflow logs, and route preview.

---

### Task 1: Add the reusable legal page and policy content

**Files:**
- Create: `artifacts/teman-nyatet/src/pages/LegalPage.tsx`
- Test: `artifacts/teman-nyatet/src/pages/LegalPage.test.tsx` (only if the repository gains a runnable test setup; otherwise typecheck/build and route-level preview are the verification for this presentational page)

**Interfaces:**
- Consumes: Wouter `Link`, existing CSS theme tokens, and Lucide icons.
- Produces: `LegalPage` default export with a `policy` prop of `'privacy' | 'terms'`.

- [ ] **Step 1: Define the page data shape and complete policy content**

Create typed policy data with:

```tsx
type PolicyKind = 'privacy' | 'terms';

type PolicySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};
```

Include a last-updated label of `31 Juli 2026`, the contact email, and all
sections from the approved design:

- Privacy: collected data, use, Google Sheets/Drive, Google API Limited Use
  boundaries, service providers, security/retention, user rights, children,
  changes, and contact.
- Terms: acceptance, service description, eligibility/account, user content,
  Google integration, payments/subscriptions, prohibited uses, availability,
  termination, disclaimer/liability, changes, governing contact, and contact.

Use transparent language: the user owns content; the app uses Google access
only to provide the connected spreadsheet workflow; Google may be
disconnected; important data should be backed up; TemanNyatet is not a
financial advisor or Google service.

- [ ] **Step 2: Build the semantic, responsive presentation**

Render:

```tsx
<main>
  <header>brand + back-to-login link</header>
  <article>
    <p>last updated</p>
    <h1>...</h1>
    <p>intro</p>
    <nav aria-label="Daftar isi">section anchor links</nav>
    <section aria-labelledby="...">...</section>
    <footer>email + cross-links</footer>
  </article>
</main>
```

Use `max-w-3xl`, readable line-height, theme tokens (`bg-background`,
`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`,
`text-primary`), and large mobile-safe hit targets. Use `Link href="/login"`
for internal navigation and `mailto:rhn.rmdhniii@gmail.com` for contact.
Include `aria-label` on the back link and stable IDs for every section.

- [ ] **Step 3: Run the first verification**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run typecheck
```

Expected: exit code 0. If the component has a type error, fix the component
before moving to route registration.

---

### Task 2: Register public routes and link them from authentication

**Files:**
- Modify: `artifacts/teman-nyatet/src/App.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/AuthPage.tsx`

**Interfaces:**
- Consumes: `LegalPage` from Task 1.
- Produces: public `/privacy-policy` and `/terms-of-service` route behavior and
  visible login-page links.

- [ ] **Step 1: Add lazy imports and route entries**

Add:

```tsx
const LegalPage = React.lazy(() => import('@/pages/LegalPage'));
```

Register two route entries whose components pass the correct policy kind:

```tsx
{
  path: '/privacy-policy',
  component: () => <LegalPage policy="privacy" />,
},
{
  path: '/terms-of-service',
  component: () => <LegalPage policy="terms" />,
},
```

If `React.ComponentType` rejects these prop-bearing wrappers, define named
zero-prop wrapper components in `App.tsx` and register those wrappers.

- [ ] **Step 2: Allow both routes through AuthGuard**

Extend the `PUBLIC_ROUTES` set to include exactly:

```tsx
new Set(['/login', '/auth/confirm', '/privacy-policy', '/terms-of-service'])
```

Verify the authenticated branch also treats legal routes as non-app routes and
redirects an authenticated user according to the existing profile state only
when necessary. The unauthenticated branch must never redirect these two
paths.

- [ ] **Step 3: Add legal links to the login page**

Import Wouter `Link` in `AuthPage.tsx` and render a small footer below the
login/register form:

```tsx
<p>
  Dengan melanjutkan, kamu menyetujui{' '}
  <Link href="/terms-of-service">Terms of Service</Link>
  {' '}dan{' '}
  <Link href="/privacy-policy">Privacy Policy</Link>.
</p>
```

Keep the copy visible in both login and register states, keyboard accessible,
and styled with existing muted/primary tokens. Do not block form submission
or introduce a new consent checkbox that could alter the current auth flow.

- [ ] **Step 4: Run typecheck and build**

Run:

```bash
pnpm --filter @workspace/teman-nyatet run typecheck
pnpm --filter @workspace/teman-nyatet run build
```

Expected: both commands exit 0 and Vite emits separate lazy chunks for the
legal page without missing-module or route type errors.

---

### Task 3: Verify public access and visual behavior

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: routes and page from Tasks 1–2.
- Produces: fresh runtime evidence that legal pages work without login.

- [ ] **Step 1: Restart the web workflow**

Restart the configured workflow:

```text
artifacts/teman-nyatet: web
```

Then refresh workflow and browser logs. Expected: Vite starts on its configured
port without runtime errors.

- [ ] **Step 2: Preview both legal routes**

Capture previews for:

```text
/privacy-policy
/terms-of-service
```

Confirm both render without a login redirect, show the TemanNyatet brand,
contact email, complete headings, and readable content.

- [ ] **Step 3: Check interactions and responsive states**

Confirm:

- Login footer opens each legal route.
- Back-to-login works.
- Cross-links between policies work.
- Email link has `mailto:` target.
- Section anchor links move within the document.
- Mobile width has no horizontal overflow.
- Light/dark theme text and borders remain readable.

- [ ] **Step 4: Review requirements before completion**

Use this final checklist:

- [ ] Two standalone public URLs exist.
- [ ] AuthGuard permits both when logged out.
- [ ] Google Sheets/Drive handling is described accurately.
- [ ] Limited-use/no-sale/no-targeted-ads language is present.
- [ ] Data deletion and account/contact instructions are present.
- [ ] Terms include content ownership, prohibited use, termination, disclaimer,
  and subscription language.
- [ ] `rhn.rmdhniii@gmail.com` appears in both pages.
- [ ] Typecheck, build, workflow startup, and preview evidence are fresh.