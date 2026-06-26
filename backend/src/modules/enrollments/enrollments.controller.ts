import { Request, Response } from 'express';
import { EnrollmentsService } from './enrollments.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { prisma } from '../../lib/prisma';

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
      const { userId, dueDate } = req.body;
      const caller = req.user!;
      
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
      
      const enrollment = await EnrollmentsService.enroll(targetUserId, courseId as string, dueDate);
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
      if (error.message === 'Enrollment not found') {
        return res.json({ status: 'NOT_ENROLLED' });
      }
      res.status(500).json({ message: error.message });
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
  static async advanceProgress(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const result = await EnrollmentsService.advanceProgress(req.user!.userId, courseId as string);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
  static async bulkEnroll(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EnrollmentsService.bulkEnroll(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

