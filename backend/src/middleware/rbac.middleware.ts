import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Role } from '@prisma/client';

export const authorize = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    next();
  };
};
