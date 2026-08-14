// Must be the first import: loads .env/.env.local into process.env before
// any other module (e.g. lib/db) runs its startup environment checks.
import "./lib/load-env.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";

// ─── Required environment variable check ────────────────────────────────────
const REQUIRED_ENV = [
  {
    key: "SUPABASE_URL",
    hint: "Supabase project URL — Dashboard → Project Settings → API",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Supabase service role key — Dashboard → Project Settings → API",
  },
] as const;

const missingVars = REQUIRED_ENV.filter(({ key }) => !process.env[key]);

// On Vercel serverless, process.exit() kills the function cold and produces
// FUNCTION_INVOCATION_FAILED before any request is handled. Log the missing
// vars but let the process continue — routes will 500 naturally, which shows
// up in Vercel's function logs and is far easier to diagnose than a silent
// cold-start crash.
if (missingVars.length > 0) {
  console.error("\n❌  Missing required environment variables:\n");
  for (const { key, hint } of missingVars) {
    console.error(`   ${key}\n      → ${hint}\n`);
  }
  console.error(
    "Set these in Vercel Project Settings → Environment Variables and redeploy.\n"
  );
  // Only exit in non-serverless environments where it is safe to do so.
  if (process.env["VERCEL"] !== "1") {
    process.exit(1);
  }
}
// ────────────────────────────────────────────────────────────────────────────

const isVercel = process.env["VERCEL"] === "1";

if (!isVercel) {
  // Vercel injects PORT at runtime; default to 8080 for local/Replit dev.
  const port = Number(process.env["PORT"]) || 8080;

  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

export default app;
