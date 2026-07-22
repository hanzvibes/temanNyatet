# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and API keys

## 2. Run the Migrations
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run `001_initial_schema.sql` first (creates the tables)
4. Run `002_add_profile_fields.sql` second (adds `name`, `phone`, and `avatar_url` to the `profiles` table)

If you already ran `001_initial_schema.sql` before these fields existed, run `002_add_profile_fields.sql` now to fix the "Gagal memperbarui nama" error.

## 3. Configure Auth

1. Go to **Authentication → Providers** and make sure **Email** is enabled.
2. Go to **Authentication → Settings**.
3. Enable **Confirm email**. This is required: new accounts cannot log in until they click the confirmation link.
4. Set **Site URL** to your production domain, e.g. `https://temannyatet.id`.
5. Add **Redirect URLs** so Supabase accepts the URLs the app sends:
   - Production: `https://temannyatet.id/login`
   - Vercel previews: `https://*.vercel.app/login`
   - Vercel wildcard (if you want to allow any path): `https://*.vercel.app/**`
   - Replit: `https://*.replit.dev/login` or `https://*.replit.dev/**`
   - Local dev: `http://localhost:5173/login`

   The app sends `emailRedirectTo: <SITE_URL>/login` for sign-up and resend-verification emails. That URL must match one of the allowed Redirect URLs.
6. (Optional) Check **Authentication → Email Templates** → **Confirm signup**. Make sure the link uses the default `{{ .ConfirmationURL }}` variable instead of a hardcoded `http://localhost:3000` URL. The same applies to **Reset password** and **Magic link** templates if you use them.

## 4. Set Environment Variables

### Frontend (Vite) — `.env.local` in `artifacts/teman-nyatet/`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: canonical domain for Supabase email confirmation links.
# Leave unset for Replit and Vercel previews (the app uses the current origin).
VITE_SITE_URL=https://temannyatet.id
```

### API Server — `.env.local` in `artifacts/api-server/`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MAYAR_WEBHOOK_SECRET=your-mayar-webhook-secret
CRON_SECRET=your-cron-secret-for-vercel
```

## 5. Mayar Setup
1. Create a Mayar account at https://mayar.id
2. Create a payment page with monthly (Rp100.000) and yearly (Rp249.000) plans
3. Set webhook URL to: `https://your-domain.com/api/mayar-webhook`
4. Copy the webhook secret and set it as `MAYAR_WEBHOOK_SECRET`

## 6. Vercel Cron (Optional)
Add to `vercel.json` at project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/archive-expired",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## 7. Profile Photos (optional, already applied if you ran `002_add_avatar_url.sql`)
Photos are uploaded through the api-server and stored in a Supabase Storage bucket called `avatars` (created automatically on first upload). No extra storage RLS setup is needed — uploads always go through the service role key server-side.

## Table Summary

| Table | Purpose |
|-------|---------|
| profiles | User subscription info, auto-created on signup |
| notes | Catatan (Notes feature) |
| transactions | Catatan Keuangan (Finance feature) |
| todos | To Do List |
| links | Link Saver |

All tables have RLS enabled — users can only access their own data.
