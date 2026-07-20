import type { NextFunction, Request, Response } from 'express';
import type { sheets_v4 } from 'googleapis';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getUserSheetConnection } from '../lib/user-sheet';

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

  return user.id;
}

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
