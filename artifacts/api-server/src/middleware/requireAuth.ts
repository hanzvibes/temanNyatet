import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      spreadsheetId?: string;
    }
  }
}

const SPREADSHEET_ID = process.env['GOOGLE_SHEETS_SPREADSHEET_ID'] ?? '';

// Verifies the caller's Supabase access token, attaches req.userId and
// req.spreadsheetId (the single shared spreadsheet, isolated by user_id per row).
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

  if (!SPREADSHEET_ID) {
    res.status(503).json({ error: 'GOOGLE_SHEETS_SPREADSHEET_ID is not configured on the server.' });
    return;
  }

  req.userId = user.id;
  req.spreadsheetId = SPREADSHEET_ID;

  next();
}
