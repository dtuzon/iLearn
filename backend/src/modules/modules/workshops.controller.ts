import { Request, Response } from 'express';
import { WorkshopsService } from './workshops.service';
import { Role } from '@prisma/client';

import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class WorkshopsController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { textResponse } = req.body;
      const fileUrl = req.file ? `/uploads/workshops/${req.file.filename}` : undefined;

      const submission = await WorkshopsService.submitWorkshop(req.user!.userId, moduleId as string, {
        fileUrl,
        textResponse
      });
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getPending(req: AuthenticatedRequest, res: Response) {
    try {
      const submissions = await WorkshopsService.getPendingSubmissions(req.user!.userId, req.user!.role as Role);

      res.json(submissions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async review(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const { status, feedback } = req.body;
      
      if (status === 'REJECTED' && !feedback) {
        return res.status(400).json({ message: 'Feedback is mandatory for rejections' });
      }

      const submission = await WorkshopsService.reviewSubmission(submissionId as string, req.user!.userId, {
        status,
        feedback
      });
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getMySubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const submission = await WorkshopsService.getSubmission(req.user!.userId, moduleId as string);
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
