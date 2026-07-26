import express, { type Express } from "express";
import cors from "cors";
import * as helmetMod from "helmet";
import * as rateLimitMod from "express-rate-limit";
import * as pinoHttpMod from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// helmet, express-rate-limit, and pino-http all ship CJS UMD types
// (`export = X`) alongside an ESM `export { X as default }` shim, and their
// package.json points at the CJS-shaped `.d.cts` for the Node runtime.
// Under some tsc invocations Vercel runs on the build (likely the post-build
// type-check pass for the @vercel/node builder), the default-import form
// `import helmet from "helmet"` resolves to the namespace object instead of
// the callable — TS2349 "This expression is not callable". The namespace +
// `.default ?? mod` pattern works regardless of which module flavor tsc
// resolves, so we use it for the three affected packages and let the
// well-typed ESM-only `cors` / `express` keep their default-import shape.
// `as any` (not `Parameters<typeof X.default>[0] => unknown`) so the
// `pinoHttp` overload-resolution chain doesn't pin us to `DestinationStream`
// and reject the `{ logger, serializers }` options object literal.
const helmet = ((helmetMod as any).default ?? helmetMod) as any;
const rateLimit = ((rateLimitMod as any).default ?? rateLimitMod) as any;
const pinoHttp = ((pinoHttpMod as any).default ?? pinoHttpMod) as any;

// Sets standard security headers (HSTS, no-sniff, frameguard, etc). CSP is
// left to the frontend's own hosting since this is a JSON API, not an HTML
// renderer.
app.use(helmet({ contentSecurityPolicy: false }));

// Cross-origin allowlist. Unset by default (matches the previous permissive
// `cors()` behavior) since the frontend calls this API with a Bearer token
// it reads from Supabase — not a cookie — so a wildcard origin can't be
// leveraged for cookie-based CSRF. Set ALLOWED_ORIGINS (comma-separated) in
// production if the frontend is ever served from a fixed, known origin to
// lock this down further.
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed`));
    },
  }),
);

// General abuse/DoS guardrail across the whole API. Generous enough for
// normal polling/CRUD use by a single user's devices.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The Mayar webhook route must receive the raw body so we can verify the
// HMAC-SHA256 signature against exact bytes. Mount express.raw() for that
// specific path BEFORE the global express.json() parser consumes the body.
app.use("/api/mayar-webhook", express.raw({ type: "application/json", limit: "1mb" }));

// All other routes get JSON-parsed bodies. 256kb comfortably covers even a
// long-form note while still bounding request size against abuse.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "TemanNyatet API",
    status: "running",
    health: "/api/healthz",
    endpoints: "/api/...",
  });
});

app.use("/api", router);

export default app;
