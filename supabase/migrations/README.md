# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and API keys

## 2. Run the Migration
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `001_initial_schema.sql`
4. Paste and run it

## 3. Configure Auth
1. Go to Authentication → Settings
2. Set **Site URL** to your production domain (e.g. `https://temannyatet.id`)
3. Add `http://localhost:5173` to **Redirect URLs** for local dev
4. Email provider is enabled by default — no changes needed

## 4. Set Environment Variables

### Frontend (Vite) — `.env.local` in `artifacts/teman-nyatet/`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
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

## Table Summary

| Table | Purpose |
|-------|---------|
| profiles | User subscription info, auto-created on signup |
| notes | Catatan (Notes feature) |
| transactions | Catatan Keuangan (Finance feature) |
| todos | To Do List |
| links | Link Saver |

All tables have RLS enabled — users can only access their own data.
