import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Verifies the caller's Supabase access token and attaches req.userId.
// Auth stays on Supabase even though app data lives in Google Sheets.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = String(req.headers['authorization'] ?? '');
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token is required' });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = user.id;
  next();
}
