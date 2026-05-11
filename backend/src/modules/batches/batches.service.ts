import { prisma } from '../../lib/prisma';
import { sendBatchEnrollmentConfirmation, sendBatchScheduleUpdateNotifications } from '../../workers/batch-notifications.worker';

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
              include: { course: true },
              orderBy: { order: 'asc' }
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
          include: { user: { include: { department: true } } }
        },
        learningPathEnrollments: {
          include: { user: { include: { department: true } } }
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
    const result = await prisma.$transaction(async (tx) => {
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
          data: data.courseSchedules.map((s: any, idx: number) => ({
            batchId: id,
            courseId: s.courseId,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null,
            order: s.order ?? idx
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

    // 4. Trigger Email Notifications if requested
    if (data.notifyScheduleChanges) {
      // Fetch the updated batch with its enrollments
      const updatedBatch = await prisma.batch.findUnique({
        where: { id },
        include: {
          course: { select: { title: true } },
          learningPath: { select: { title: true } },
          enrollments: { include: { user: { include: { department: true, immediateSuperior: true } } } },
          learningPathEnrollments: { include: { user: { include: { department: true, immediateSuperior: true } } } }
        }
      });

      if (updatedBatch) {
        const contentTitle = updatedBatch.course?.title ?? updatedBatch.learningPath?.title ?? updatedBatch.name;
        const enrolledUsers = [
          ...updatedBatch.enrollments.map(e => e.user),
          ...updatedBatch.learningPathEnrollments.map(e => e.user)
        ];

        if (enrolledUsers.length > 0) {
          sendBatchScheduleUpdateNotifications(updatedBatch.name, contentTitle, enrolledUsers).catch(err => {
            console.error('Failed to send batch schedule update notifications:', err);
          });
        }
      }
    }

    return result;
  }

  static async assignLearners(batchId: string, userIds: string[]) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: { select: { title: true } },
        learningPath: { select: { title: true } },
      }
    });

    if (!batch) throw new Error('Batch not found');

    await prisma.$transaction(async (tx) => {
      // 1. Un-assign current learners from this batch
      await tx.enrollment.updateMany({
        where: { batchId },
        data: { batchId: null }
      });
      await tx.learningPathEnrollment.updateMany({
        where: { batchId },
        data: { batchId: null }
      });

      // 2. Re-assign the selected learners
      for (const userId of userIds) {
        if (batch.courseId) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId, courseId: batch.courseId } },
            update: { batchId, dueDate: batch.endDate },
            create: { userId, courseId: batch.courseId, batchId, dueDate: batch.endDate, status: 'NOT_STARTED' }
          });
        } else if (batch.learningPathId) {
          await tx.learningPathEnrollment.upsert({
            where: { userId_learningPathId: { userId, learningPathId: batch.learningPathId } },
            update: { batchId, dueDate: batch.endDate },
            create: { userId, learningPathId: batch.learningPathId, batchId, dueDate: batch.endDate, status: 'NOT_STARTED' }
          });
        }
      }
    });

    // 3. Fire enrollment confirmation emails (non-blocking)
    if (userIds.length > 0) {
      const contentTitle = batch.course?.title ?? batch.learningPath?.title ?? batch.name;
      const enrolledUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: {
          department: true,
          immediateSuperior: true,
        },
      });
      sendBatchEnrollmentConfirmation(
        batch.name,
        contentTitle,
        batch.startDate,
        batch.endDate,
        enrolledUsers
      ).catch((e) => console.error('[Batch] Failed to send enrollment confirmation emails:', e));
    }
  }

  static async delete(id: string) {
    return prisma.batch.delete({ where: { id } });
  }
}
