import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../lib/prisma';

export const auditLog = (action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // We only log if the request is successful (after next() is called or using res.on('finish'))
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await prisma.auditLog.create({
            data: {
              action,
              userId: req.user?.userId,
              ipAddress: req.ip,
              metadata: {
                method: req.method,
                path: req.path,
                params: req.params,
                body: req.method !== 'GET' ? req.body : undefined,
              },
            },
          });
        } catch (error) {
          console.error('Audit Log Error:', error);
        }
      }
    });

    next();
  };
};
