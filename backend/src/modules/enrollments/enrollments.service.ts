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
        },
        user: {
          include: {
            activitySubmissions: {
              where: { module: { courseId } }
            }
          }
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
            status: isFinished ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
            completedAt: isFinished ? new Date() : undefined
          }
        });

        // NEW: Learning Path Completion Logic
        if (isFinished) {
          await this.checkLearningPathCompletion(userId, module.courseId);
        }
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

  static async checkLearningPathCompletion(userId: string, completedCourseId: string) {
    // 1. Find all learning path enrollments for this user that include this course
    const pathEnrollments = await prisma.learningPathEnrollment.findMany({
      where: {
        userId,
        status: { not: EnrollmentStatus.COMPLETED }
      },
      include: {
        learningPath: {
          include: {
            pathCourses: true
          }
        }
      }
    });

    for (const pe of pathEnrollments) {
      // 2. Check if the completed course is part of this path
      const courseIdsInPath = pe.learningPath.pathCourses.map(pc => pc.courseId);
      if (courseIdsInPath.includes(completedCourseId)) {
        // 3. Check if all courses in this path are completed by the user
        const completedCount = await prisma.enrollment.count({
          where: {
            userId,
            courseId: { in: courseIdsInPath },
            status: EnrollmentStatus.COMPLETED
          }
        });

        if (completedCount === courseIdsInPath.length) {
          // 4. Mark Learning Path as completed
          await prisma.learningPathEnrollment.update({
            where: { id: pe.id },
            data: {
              status: EnrollmentStatus.COMPLETED,
              completedAt: new Date()
            }
          });
        }
      }
    }
  }
  static async advanceProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { 
        course: { 
          include: { 
            _count: { select: { modules: true } } 
          } 
        } 
      }
    });

    if (!enrollment) throw new Error('Enrollment not found');

    const totalModules = enrollment.course._count.modules;
    const nextOrder = enrollment.currentModuleOrder + 1;
    
    // We allow progress to reach totalModules + 1 to account for the Closing page
    const isFinished = nextOrder > totalModules;

    return prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        currentModuleOrder: nextOrder,
        status: isFinished ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
        completedAt: isFinished ? new Date() : undefined
      }
    });
  }

}


