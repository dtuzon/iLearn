import { Request, Response } from 'express';
import { WorkshopsService } from './workshops.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class WorkshopsController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      if (!req.file) throw new Error('No file uploaded');

      const fileUrl = `/uploads/workshops/${req.file.filename}`;
      const progress = await WorkshopsService.submitWorkshop(req.user!.userId, moduleId as string, fileUrl);
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async grade(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { enrollmentId, completed, gradeNote } = req.body;
      const progress = await WorkshopsService.gradeWorkshop(moduleId as string, enrollmentId, {
        completed,
        gradeNote,
        gradedBy: req.user!.userId
      });
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
