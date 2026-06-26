import { Request, Response } from 'express';
import { LearningPathsService } from './learning-paths.service';
import { StorageService } from '../../lib/services/storage.service';
import { prisma } from '../../lib/prisma';

export class LearningPathsController {
  static async getAll(req: any, res: Response) {
    try {
      const role = req.user?.role;
      const paths = await LearningPathsService.getAll(role);
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
      const { userId, dueDate } = req.body;
      const caller = (req as any).user;
      
      let targetUserId = caller.userId;
      
      if (userId && userId !== caller.userId) {
        if (['ADMINISTRATOR', 'LEARNING_MANAGER'].includes(caller.role)) {
          targetUserId = userId;
        } else if (['SUPERVISOR', 'DEPARTMENT_HEAD'].includes(caller.role)) {
          const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { immediateSuperiorId: true }
          });
          if (targetUser && targetUser.immediateSuperiorId === caller.userId) {
            targetUserId = userId;
          } else {
            return res.status(403).json({ message: 'Forbidden: You can only enroll your direct reports' });
          }
        } else {
          return res.status(403).json({ message: 'Forbidden: Insufficient privileges to enroll other users' });
        }
      }
      
      const enrollment = await LearningPathsService.enroll(targetUserId, id as string, dueDate);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getUserEnrollments(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const callerId = (req as any).user?.userId;
      const callerRole = (req as any).user?.role;

      // Security Fix: Prevent basic employees from arbitrarily querying other users' learning paths
      if (callerRole === 'EMPLOYEE' && userId !== callerId) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges to view this user\'s learning paths' });
      }

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

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, versionTag, changeSummary } = req.body;
      const path = await LearningPathsService.updateStatus(id as string, status, versionTag, changeSummary);
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async uploadThumbnail(req: any, res: Response) {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const thumbnailUrl = await StorageService.uploadFile(req.file, 'lp-thumbnails');
      
      const path = await LearningPathsService.uploadThumbnail(id as string, thumbnailUrl);
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await LearningPathsService.getVersions(id as string);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const newVersion = await LearningPathsService.createVersion(id as string);
      res.status(201).json(newVersion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async discardDraft(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await LearningPathsService.discardDraft(id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}



