import { prisma } from '../../lib/prisma';

export class BatchesService {
  static async getAll() {
    return prisma.batch.findMany({
      include: {
        course: { select: { title: true } },
        learningPath: { select: { title: true } },
        _count: { select: { enrollments: true, learningPathEnrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getById(id: string) {
    return prisma.batch.findUnique({
      where: { id },
      include: {
        course: true,
        learningPath: {
          include: {
            pathCourses: {
              include: { course: true }
            }
          }
        },
        courseSchedules: {
          include: { course: true }
        },
        activityCheckers: {
          include: { user: true }
        },
        enrollments: {
          include: { user: true }
        },
        learningPathEnrollments: {
          include: { user: true }
        }
      }
    });
  }

  static async create(data: any) {
    return prisma.batch.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || 'UPCOMING',
        courseId: data.courseId,
        learningPathId: data.learningPathId,
        courseSchedules: {
          create: data.courseSchedules?.map((s: any) => ({
            courseId: s.courseId,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null
          }))
        },
        activityCheckers: {
          create: data.checkerIds?.map((userId: string) => ({
            userId
          }))
        }
      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const batch = await tx.batch.update({
        where: { id },
        data: {
          name: data.name,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          status: data.status,
          courseId: data.courseId,
          learningPathId: data.learningPathId
        }
      });

      // 2. Sync Schedules
      if (data.courseSchedules) {
        await tx.batchCourseSchedule.deleteMany({ where: { batchId: id } });
        await tx.batchCourseSchedule.createMany({
          data: data.courseSchedules.map((s: any) => ({
            batchId: id,
            courseId: s.courseId,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null
          }))
        });
      }

      // 3. Sync Checkers
      if (data.checkerIds) {
        await tx.batchChecker.deleteMany({ where: { batchId: id } });
        await tx.batchChecker.createMany({
          data: data.checkerIds.map((userId: string) => ({
            batchId: id,
            userId
          }))
        });
      }

      return batch;
    });
  }

  static async assignLearners(batchId: string, userIds: string[]) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId }
    });

    if (!batch) throw new Error('Batch not found');

    return prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        if (batch.courseId) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId, courseId: batch.courseId } },
            update: { batchId },
            create: { userId, courseId: batch.courseId, batchId }
          });
        } else if (batch.learningPathId) {
          await tx.learningPathEnrollment.upsert({
            where: { userId_learningPathId: { userId, learningPathId: batch.learningPathId } },
            update: { batchId },
            create: { userId, learningPathId: batch.learningPathId, batchId }
          });
        }
      }
    });
  }

  static async delete(id: string) {
    return prisma.batch.delete({ where: { id } });
  }
}
