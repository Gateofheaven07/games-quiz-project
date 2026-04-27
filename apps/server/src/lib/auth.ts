import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthPayload } from '@quiz-battle/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: Omit<AuthPayload, 'iat' | 'exp'>) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY as any });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY as any });
  
  return {
    token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    console.error('[Auth] Token verification failed', error);
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    console.error('[Auth] Refresh token verification failed', error);
    return null;
  }
}
