import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Missing token' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    if (payload.type !== 'access') {
      res.status(401).json({ detail: 'Invalid token type' });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}
