import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getUserSpreadsheetId } from '../lib/user-sheet';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      spreadsheetId?: string;
    }
  }
}

// Verifies the Supabase access token in the Authorization header and returns
// the caller's user id, or null after writing an error response.
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

  return user.id;
}

// Verifies the caller's token and attaches req.userId. Use for endpoints that
// don't need the caller's spreadsheet (profile, spreadsheet connect/status).
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await verifyToken(req, res);
  if (!userId) return;
  req.userId = userId;
  next();
}

// Verifies the caller's token AND resolves their connected private spreadsheet.
// Use for every notes/transactions/todos/links data endpoint. Responds 428 if
// the user hasn't connected a spreadsheet yet — the frontend should never hit
// this in practice (it gates those routes behind /connect-sheet first), but
// the API enforces it independently too.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await verifyToken(req, res);
  if (!userId) return;

  let spreadsheetId: string | null;
  try {
    spreadsheetId = await getUserSpreadsheetId(userId);
  } catch (err) {
    req.log.error({ err, userId }, 'Failed to resolve spreadsheet for user');
    res.status(500).json({ error: 'Failed to resolve your spreadsheet' });
    return;
  }

  if (!spreadsheetId) {
    res.status(428).json({
      error: 'SPREADSHEET_NOT_CONNECTED',
      message: 'Hubungkan Google Spreadsheet pribadi kamu sebelum menggunakan fitur ini.',
    });
    return;
  }

  req.userId = userId;
  req.spreadsheetId = spreadsheetId;
  next();
}
