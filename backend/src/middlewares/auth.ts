import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
  companyId?: string;
  financialYearId?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: 'Account is locked' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }
    logger.error('Auth middleware error', err);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (user && user.status === 'active') req.user = user;
  } catch {
    // ignore invalid token
  }
  next();
}
