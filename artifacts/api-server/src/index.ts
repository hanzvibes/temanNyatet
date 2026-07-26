import app from "./app";
import { logger } from "./lib/logger";

// ─── Required environment variable check ────────────────────────────────────
// Fail loudly at startup rather than silently running and then throwing a 500
// the first time a user hits a protected endpoint. Each entry lists the env var
// key and a short hint so the operator knows exactly where to get the value.
const REQUIRED_ENV = [
  {
    key: "SUPABASE_URL",
    hint: "Supabase project URL — Dashboard → Project Settings → API",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Supabase service role key — Dashboard → Project Settings → API",
  },
  {
    key: "GOOGLE_CLIENT_ID",
    hint: "Google OAuth 2.0 client ID — Cloud Console → APIs & Services → Credentials",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    hint: "Google OAuth 2.0 client secret — same credentials page as above",
  },
  {
    key: "GOOGLE_OAUTH_STATE_SECRET",
    hint: "Random HMAC signing secret — generate with: openssl rand -hex 32",
  },
] as const;

const missingVars = REQUIRED_ENV.filter(({ key }) => !process.env[key]);
if (missingVars.length > 0) {
  // Use console.error here because the logger may not be fully initialised yet.
  console.error("\n❌  Missing required environment variables:\n");
  for (const { key, hint } of missingVars) {
    console.error(`   ${key}\n      → ${hint}\n`);
  }
  console.error(
    "Set these in Replit Secrets (or your .env file) and restart the server.\n"
  );
  process.exit(1);
}
// ────────────────────────────────────────────────────────────────────────────

// Vercel (and most PaaS targets) inject their own PORT at runtime, but we
// don't want a missing/unset PORT to crash the process outright — default
// to 8080 (matches the port documented in replit.md for local dev).
const port = Number(process.env["PORT"]) || 8080;

// On Vercel, @vercel/node wraps the default-exported Express app as a
// serverless function handler — calling app.listen() there would block
// forever trying to bind a port that doesn't exist in PaaS runtime.
// On Replit / local dev / a self-hosted Node process, start the HTTP
// server normally.
const isVercel = process.env["VERCEL"] === "1";

if (!isVercel) {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

export default app;
