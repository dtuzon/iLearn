import { Request, Response } from 'express';
import { ActivitiesService } from './activities.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ActivitiesController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.body;
      const submission = await ActivitiesService.submit(req.user!.userId, moduleId, req.body);
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getCheckableBatches(req: AuthenticatedRequest, res: Response) {
    try {
      const batches = await ActivitiesService.getCheckableBatches(req.user!.userId);
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getBatchSubmissions(req: AuthenticatedRequest, res: Response) {
    try {
      const submissions = await ActivitiesService.getBatchSubmissions(req.params.batchId as string, req.user!.userId);
      res.json(submissions);
    } catch (error: any) {
      res.status(403).json({ message: error.message });
    }
  }

  static async grade(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await ActivitiesService.gradeSubmission(req.params.id as string, req.user!.userId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
