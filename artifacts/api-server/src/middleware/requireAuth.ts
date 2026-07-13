import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getOrCreateUserSpreadsheet } from '../lib/user-sheet';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      spreadsheetId?: string;
    }
  }
}

// Verifies the caller's Supabase access token, attaches req.userId and
// req.spreadsheetId. The spreadsheet is created automatically on first login.
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

  try {
    req.spreadsheetId = await getOrCreateUserSpreadsheet(user.id);
  } catch (err) {
    req.log.error({ err, userId: user.id }, 'Failed to resolve user spreadsheet');
    res.status(503).json({ error: 'Could not access your data store. Please try again.' });
    return;
  }

  next();
}
