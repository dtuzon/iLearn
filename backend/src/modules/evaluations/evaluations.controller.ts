import { Response } from 'express';
import { EvaluationsService } from './evaluations.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class EvaluationsController {
  static async getPendingTeam(req: AuthenticatedRequest, res: Response) {
    try {
      const evaluations = await EvaluationsService.getPendingTeamEvaluations(req.user!.userId);
      res.json(evaluations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async submitBehavioral(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EvaluationsService.submitBehavioralEvaluation(req.user!.userId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
