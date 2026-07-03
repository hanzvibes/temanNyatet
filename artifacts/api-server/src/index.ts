import app from "./app";
import { logger } from "./lib/logger";

// Vercel (and most PaaS targets) inject their own PORT at runtime, but we
// don't want a missing/unset PORT to crash the process outright — default
// to 8080 (matches the port documented in replit.md for local dev).
const port = Number(process.env["PORT"]) || 8080;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
