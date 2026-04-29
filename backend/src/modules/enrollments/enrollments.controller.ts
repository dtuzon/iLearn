import { Request, Response } from 'express';
import { EnrollmentsService } from './enrollments.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class EnrollmentsController {
  static async getMyEnrollments(req: AuthenticatedRequest, res: Response) {
    try {
      const enrollments = await EnrollmentsService.getMyEnrollments(req.user!.userId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async enroll(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const enrollment = await EnrollmentsService.enroll(req.user!.userId, courseId as string);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getProgress(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const progress = await EnrollmentsService.getProgress(req.user!.userId, courseId as string);
      res.json(progress);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async completeModule(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const result = await EnrollmentsService.completeModule(req.user!.userId, moduleId as string);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async submitOnlineEvaluation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // enrollmentId
      const result = await EnrollmentsService.submitOnlineEvaluation(req.user!.userId, id as string, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
