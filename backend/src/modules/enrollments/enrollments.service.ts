import { prisma } from '../../lib/prisma';
import { EnrollmentStatus } from '@prisma/client';

export class EnrollmentsService {
  static async getMyEnrollments(userId: string) {
    return prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lecturer: { select: { firstName: true, lastName: true } },
            _count: { select: { modules: true } }
          }
        }
      }
    });
  }

  static async enroll(userId: string, courseId: string) {
    return prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {}, // Don't reset if already enrolled
      create: {
        userId,
        courseId,
        status: EnrollmentStatus.NOT_STARTED,
        currentModuleOrder: 0
      }
    });
  }

  static async getProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      include: {
        moduleProgress: {
          include: { module: true }
        }
      }
    });

    if (!enrollment) throw new Error('Enrollment not found');

    return enrollment;
  }

  static async completeModule(userId: string, moduleId: string) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: module.courseId
        }
      }
    });

    if (!enrollment) throw new Error('User not enrolled');

    // Mark module as completed
    await prisma.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId: enrollment.id,
          moduleId
        }
      },
      update: { completed: true, completedAt: new Date() },
      create: {
        enrollmentId: enrollment.id,
        moduleId,
        completed: true,
        completedAt: new Date()
      }
    });

    // Check if this was the current module and increment currentModuleOrder
    if (module.sequenceOrder === enrollment.currentModuleOrder) {
      const nextOrder = enrollment.currentModuleOrder + 1;
      
      // Check if there are more modules
      const totalModules = await prisma.courseModule.count({
        where: { courseId: module.courseId }
      });

      const isFinished = nextOrder >= totalModules;

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          currentModuleOrder: nextOrder,
          status: isFinished ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS
        }
      });
    }

    return { message: 'Module completed' };
  }

  static async submitOnlineEvaluation(userId: string, enrollmentId: string, data: { moduleId: string, comments?: string, facilitatorRatings: any[] }) {
    // 1. Save the evaluation result
    await prisma.onlineEvaluationResult.create({
      data: {
        userId,
        moduleId: data.moduleId,
        comments: data.comments,
        facilitatorRatings: data.facilitatorRatings
      }
    });

    // 2. Mark the module as complete
    return this.completeModule(userId, data.moduleId);
  }
}
