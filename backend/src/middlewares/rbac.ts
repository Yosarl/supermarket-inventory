import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const isAdmin = req.user.roles.includes('Admin');
    const hasPermission =
      isAdmin || req.user.permissions.includes(permission) || req.user.permissions.includes('*');
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const hasRole = roles.some((r) => req.user!.roles.includes(r as any));
    if (!hasRole) {
      res.status(403).json({ success: false, message: 'Insufficient role' });
      return;
    }
    next();
  };
}

export function requireCompanyAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  const companyId = req.headers['x-company-id'] as string || req.body?.companyId || req.query?.companyId;
  if (!companyId) {
    next();
    return;
  }
  const hasAccess =
    req.user.roles.includes('Admin') ||
    req.user.companyAccess.some((id) => id.toString() === companyId);
  if (!hasAccess) {
    res.status(403).json({ success: false, message: 'No access to this company' });
    return;
  }
  req.companyId = companyId;
  next();
}
