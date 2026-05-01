import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.user = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload) {
        req.user = {
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
        };
      }
    }

    next();
  } catch (error) {
    console.error('[Optional Auth Middleware] Error:', error);
    next();
  }
}
