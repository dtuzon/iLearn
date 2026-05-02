import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class DashboardController {
  static async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const metrics = await DashboardService.getMetrics(
        req.user!.userId,
        req.user!.role,
        req.user!.departmentId
      );
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
