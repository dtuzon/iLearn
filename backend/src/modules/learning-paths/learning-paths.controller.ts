import { Request, Response } from 'express';
import { LearningPathsService } from './learning-paths.service';

export class LearningPathsController {
  static async getAll(req: Request, res: Response) {
    try {
      const paths = await LearningPathsService.getAll();
      res.json(paths);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const path = await LearningPathsService.getById(req.params.id as string);
      if (!path) return res.status(404).json({ message: 'Learning Path not found' });
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const path = await LearningPathsService.create(req.body);
      res.status(201).json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const path = await LearningPathsService.update(req.params.id as string, req.body);
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await LearningPathsService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async syncCourses(req: Request, res: Response) {
    try {
      const { courses } = req.body;
      if (!Array.isArray(courses)) {
        return res.status(400).json({ message: 'Courses must be an array' });
      }
      const path = await LearningPathsService.syncCourses(req.params.id as string, courses);
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async enroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const effectiveUserId = (userId || (req as any).user.id) as string;
      
      const enrollment = await LearningPathsService.enroll(effectiveUserId, id as string);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getUserEnrollments(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const enrollments = await LearningPathsService.getUserEnrollments(userId as string);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateCertificateTemplate(req: any, res: Response) {
    try {
      const { id } = req.params;
      const designConfig = req.body.designConfig ? JSON.parse(req.body.designConfig) : undefined;
      
      const { StorageService } = await import('../../lib/services/storage.service');
      let backgroundImageUrl = undefined;
      
      if (req.file) {
        backgroundImageUrl = await StorageService.uploadFile(req.file, 'lp-certificates');
      }

      const template = await LearningPathsService.upsertCertificateTemplate(id as string, {
        backgroundImageUrl,
        designConfig
      });

      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}


