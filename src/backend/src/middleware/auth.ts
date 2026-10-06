import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../shared/config';

export const JWT_ISSUER = 'kapitrace';
export const JWT_AUDIENCE = 'kapitrace-web';
export type AuthRole = 'admin' | 'analyst' | 'viewer';
export interface AuthUser { id: string; email: string; role: AuthRole }
export interface AuthRequest extends Request { user?: AuthUser }

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  req.user = undefined;
  const header = req.header('Authorization');
  const match = typeof header === 'string' && header.length <= 8192
    ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header)
    : null;
  let user: AuthUser;
  try {
    if (!match) throw new Error('Missing bearer token');
    const decoded = jwt.verify(match[1], jwtSecret(), {
      algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE,
    });
    const now = Math.floor(Date.now() / 1000);
    if (typeof decoded === 'string' ||
        typeof decoded.id !== 'string' || !decoded.id || decoded.id.length > 128 ||
        typeof decoded.email !== 'string' || !decoded.email || decoded.email.length > 254 ||
        !['admin', 'analyst', 'viewer'].includes(decoded.role) ||
        typeof decoded.iat !== 'number' || !Number.isSafeInteger(decoded.iat) || decoded.iat > now ||
        typeof decoded.exp !== 'number' || !Number.isSafeInteger(decoded.exp) ||
        decoded.exp <= decoded.iat || decoded.exp - decoded.iat > 86400) {
      throw new Error('Invalid identity claims');
    }
    user = { id: decoded.id, email: decoded.email, role: decoded.role as AuthRole };
  } catch {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'Authentication required. Token missing, expired or invalid.' });
    return;
  }
  req.user = user;
  next();
};

export const authorize = (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    return;
  }
  next();
};
