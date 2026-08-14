import type { NextFunction, Request, Response } from 'express';
import * as rateLimitMod from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase-admin.js';

// express-rate-limit ships CJS UMD types (`export = X` in `dist/index.d.ts`)
// alongside an ESM default-export shim. Vercel's tsc post-build type-check
// resolves it more strictly than local tsc and breaks the default-import.
// The namespace + `.default ?? mod` pattern is robust under both shapes.
const rateLimit = ((rateLimitMod as any).default ?? rateLimitMod) as any;

type VerifiedToken = {
  userId: string;
  emailConfirmed: boolean;
  expiresAt: number;
};

// The API polls data endpoints frequently. Re-verifying the same access token
// over the network for requests arriving within the same short window adds
// avoidable latency, especially on mobile connections. This is intentionally
// short-lived: revocations are still picked up on the next verification window.
const TOKEN_CACHE_TTL_MS = 5_000;
const verifiedTokenCache = new Map<string, VerifiedToken>();
const tokenVerificationInFlight = new Map<string, Promise<VerifiedToken | null>>();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Verifies the Supabase access token in the Authorization header.
async function verifyToken(req: Request, res: Response): Promise<string | null> {
  const authHeader = String(req.headers['authorization'] ?? '');
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token is required' });
    return null;
  }

  const now = Date.now();
  const cached = verifiedTokenCache.get(token);
  let verified = cached && cached.expiresAt > now ? cached : undefined;
  if (!verified) {
    verifiedTokenCache.delete(token);
    const existingVerification = tokenVerificationInFlight.get(token);
    const verification = existingVerification ?? (async () => {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return null;
      const result: VerifiedToken = {
        userId: user.id,
        emailConfirmed: Boolean(user.email_confirmed_at),
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      };
      verifiedTokenCache.set(token, result);
      return result;
    })();
    if (!existingVerification) {
      tokenVerificationInFlight.set(token, verification);
      void verification.then(
        () => {
          if (tokenVerificationInFlight.get(token) === verification) {
            tokenVerificationInFlight.delete(token);
          }
        },
        () => {
          if (tokenVerificationInFlight.get(token) === verification) {
            tokenVerificationInFlight.delete(token);
          }
        },
      );
    }
    verified = await verification ?? undefined;
  }

  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // Enforce email verification on the server side too. An unverified user should
  // never be able to access protected resources, even if they somehow obtain a
  // session token while their email is still pending.
  if (!verified.emailConfirmed) {
    res.status(401).json({ error: 'Email not confirmed. Silakan verifikasi email Anda terlebih dahulu sebelum login.' });
    return null;
  }

  return verified.userId;
}

// Per-user rate limiter for data mutations. Mounted after authentication so the
// key is the authenticated userId rather than the IP (users may share IPs).
export const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // generous for polling + normal CRUD; protect against abuse
  standardHeaders: true,
  legacyHeaders: false,
  // Cast rateLimit to `any` upstream (see top of file) so its option
  // callbacks aren't typed — give the params an explicit `any` here so
  // `noImplicitAny: true` doesn't reject them.
  keyGenerator(req: any) {
    return req.userId ?? ipKeyGenerator(req.ip ?? 'unknown');
  },
  skip(req: any) {
    // Only apply to authenticated requests; unauthenticated requests are handled
    // by the global rate limiter in app.ts.
    return !req.userId;
  },
  handler(_req: any, res: any) {
    res.status(429).json({ error: 'Too many requests. Slow down.' });
  },
});

// Verifies the caller's token and attaches req.userId.
// All app data routes use this — PostgreSQL is always the data store so no
// further connection setup is needed.
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await verifyToken(req, res);
  if (!userId) return;
  req.userId = userId;
  next();
}

// requireAuth is now identical to requireUser. PostgreSQL is always used for
// app data (notes, transactions, todos, links).
export const requireAuth = requireUser;
