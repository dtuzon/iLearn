import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

export class DashboardController {
  static async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await DashboardService.getMetrics(req.user!.userId, req.user!.role as Role);

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
