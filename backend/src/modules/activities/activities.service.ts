import { prisma } from '../../lib/prisma';
import { pusher } from '../../lib/pusher';
import { SubmissionStatus, EnrollmentStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export class ActivitiesService {
  static async submit(userId: string, moduleId: string, data: { fileUrl?: string; textResponse?: string }) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    // Find the learner's batch if they are enrolled in one
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: module.courseId } }
    });

    const batchId = enrollment?.batchId || null;

    const submission = await prisma.activitySubmission.upsert({
      where: {
        user_module_submission: { userId, moduleId }
      },
      update: {
        fileUrl: data.fileUrl,
        textResponse: data.textResponse,
        status: SubmissionStatus.PENDING_REVIEW,
        batchId,
        feedback: null,
        submittedAt: new Date()
      },
      create: {
        userId,
        moduleId,
        batchId,
        fileUrl: data.fileUrl,
        textResponse: data.textResponse,
        status: SubmissionStatus.PENDING_REVIEW
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true }
        },
        module: {
          include: { course: { select: { title: true } } }
        }
      }
    });

    // Real-time notification to checkers of this batch
    if (batchId) {
      await pusher.trigger(`batch-${batchId}`, 'new-submission', submission);
    }

    return submission;
  }

  static async getCheckableBatches(userId: string) {
    return prisma.batch.findMany({
      where: {
        activityCheckers: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: {
            activitySubmissions: {
              where: { status: SubmissionStatus.PENDING_REVIEW }
            }
          }
        },
        course: { select: { title: true } },
        learningPath: { select: { title: true } }
      }
    });
  }

  static async getBatchSubmissions(batchId: string, checkerId: string) {
    // Security check: Is this user a checker for this batch?
    const isChecker = await prisma.batchChecker.findUnique({
      where: { batchId_userId: { batchId, userId: checkerId } }
    });

    if (!isChecker) throw new Error('Unauthorized: You are not a checker for this batch.');

    return prisma.activitySubmission.findMany({
      where: { 
        batchId,
        status: SubmissionStatus.PENDING_REVIEW
      },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        module: { select: { title: true, type: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  static async gradeSubmission(id: string, checkerId: string, data: { status: SubmissionStatus; score?: number; feedback?: string }) {
    const submission = await prisma.activitySubmission.findUnique({
      where: { id },
      include: { module: { include: { course: true } } }
    });

    if (!submission) throw new Error('Submission not found');

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.activitySubmission.update({
        where: { id },
        data: {
          status: data.status,
          score: data.score,
          feedback: data.feedback,
          gradedAt: new Date(),
          gradedById: checkerId
        }
      });

      // If approved, mark module progress as completed
      if (data.status === SubmissionStatus.APPROVED) {
        const enrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: submission.userId, courseId: submission.module.courseId } }
        });

        if (enrollment) {
          await tx.moduleProgress.upsert({
            where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: submission.moduleId } },
            update: { completed: true, completedAt: new Date() },
            create: { enrollmentId: enrollment.id, moduleId: submission.moduleId, completed: true, completedAt: new Date() }
          });
        }
      }

      return result;
    });

    // Notify Student Real-time
    await pusher.trigger(`user-${submission.userId}`, 'activity-graded', {
      submissionId: id,
      status: data.status,
      feedback: data.feedback,
      courseTitle: submission.module.course.title
    });

    // Create Notification
    await NotificationsService.createNotification({
      userId: submission.userId,
      title: data.status === SubmissionStatus.APPROVED ? 'Activity Approved!' : 'Activity Needs Revision',
      message: `Your work for "${submission.module.course.title}" was reviewed. Status: ${data.status}.`,
      link: `/learning/course/${submission.module.courseId}`
    });

    return updated;
  }
}
