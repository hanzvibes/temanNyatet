import type { NextFunction, Request, Response } from 'express';
import type { sheets_v4 } from 'googleapis';
import * as rateLimitMod from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { getUserSheetConnection } from '../lib/user-sheet.js';
import { usesPostgresDataStore } from '../lib/data-store.js';

// express-rate-limit ships CJS UMD types (`export = X` in `dist/index.d.ts`)
// alongside an ESM default-export shim. Vercel's tsc post-build type-check
// resolves it more strictly than local tsc and breaks the default-import.
// The namespace + `.default ?? mod` pattern is robust under both shapes.
const rateLimit = ((rateLimitMod as any).default ?? rateLimitMod) as any;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      spreadsheetId?: string;
      sheetsClient?: sheets_v4.Sheets;
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

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // Enforce email verification on the server side too. An unverified user should
  // never be able to access protected resources, even if they somehow obtain a
  // session token while their email is still pending.
  if (!user.email_confirmed_at) {
    res.status(401).json({ error: 'Email not confirmed. Silakan verifikasi email Anda terlebih dahulu sebelum login.' });
    return null;
  }

  return user.id;
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
// Use for endpoints that don't need the Sheets client (profile, auth/google).
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await verifyToken(req, res);
  if (!userId) return;
  req.userId = userId;
  next();
}

// Verifies the caller's token AND resolves their per-user Google Sheets client.
// Responds 428 if the user hasn't connected Google OAuth yet, or hasn't had a
// spreadsheet created. The frontend should never hit this in practice (it gates
// routes behind /connect-sheet), but the API enforces it independently.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await verifyToken(req, res);
  if (!userId) return;

  if (usesPostgresDataStore()) {
    req.userId = userId;
    next();
    return;
  }

  let connection: { spreadsheetId: string; sheets: sheets_v4.Sheets } | null;
  try {
    connection = await getUserSheetConnection(userId);
  } catch (err) {
    req.log.error({ err, userId }, 'Failed to resolve Google Sheets connection for user');
    res.status(500).json({ error: 'Failed to resolve your spreadsheet connection' });
    return;
  }

  if (!connection) {
    res.status(428).json({
      error: 'GOOGLE_NOT_CONNECTED',
      message: 'Hubungkan Google Drive kamu terlebih dahulu untuk menggunakan fitur ini.',
    });
    return;
  }

  req.userId = userId;
  req.spreadsheetId = connection.spreadsheetId;
  req.sheetsClient = connection.sheets;
  next();
}
