import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, SubmissionStatus, CheckerType, Role } from '@prisma/client';

export class WorkshopsService {
  static async submitWorkshop(userId: string, moduleId: string, data: { fileUrl?: string; textResponse?: string }) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    // Find existing submission or create new one
    const submission = await prisma.activitySubmission.upsert({
      where: {
        // We don't have a unique constraint on [userId, moduleId] in ActivitySubmission yet, 
        // but we should probably find the most recent one or enforce uniqueness.
        // For now, let's assume one submission per user per module.
        id: (await prisma.activitySubmission.findFirst({
          where: { userId, moduleId }
        }))?.id || 'new-id' 
      },
      update: {
        fileUrl: data.fileUrl,
        textResponse: data.textResponse,
        status: SubmissionStatus.PENDING,
        feedback: null, // Clear feedback on resubmit
        submittedAt: new Date()
      },
      create: {
        userId,
        moduleId,
        fileUrl: data.fileUrl,
        textResponse: data.textResponse,
        status: SubmissionStatus.PENDING
      }
    });

    // Mark module as completed in progress so they can move to the next module
    // But the certificate will be gated by the APPROVED status of this submission.
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: module.courseId } }
    });

    if (enrollment) {
      await prisma.moduleProgress.upsert({
        where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
        update: { completed: true, completedAt: new Date(), submittedAt: new Date() },
        create: { enrollmentId: enrollment.id, moduleId, completed: true, completedAt: new Date(), submittedAt: new Date() }
      });
    }

    // Notify Checker
    await this.notifyChecker(module, userId);

    return submission;
  }

  private static async notifyChecker(module: any, studentId: string) {
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    let checkerId: string | null = null;

    if (module.checkerType === CheckerType.IMMEDIATE_SUPERIOR) {
      checkerId = student?.immediateSuperiorId || null;
    } else if (module.checkerType === CheckerType.COURSE_CREATOR) {
      checkerId = module.course.lecturerId;
    } else if (module.checkerType === CheckerType.SPECIFIC_USER) {
      checkerId = module.specificCheckerId;
    }

    if (checkerId) {
      await prisma.notification.create({
        data: {
          userId: checkerId,
          message: `New activity submission from ${student?.firstName} ${student?.lastName} for course: ${module.course.title}`,
          link: `/approvals/activities`
        }
      });
    }
  }

  static async getPendingSubmissions(checkerId: string, role: Role) {
    // This is a complex query because of different checker types.
    // For now, let's get submissions where the module's checker matches the user.
    
    // Submissions where I am the Specific Checker
    const specific = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        module: { checkerType: CheckerType.SPECIFIC_USER, specificCheckerId: checkerId }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Submissions where I am the Course Creator
    const asCreator = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        module: { checkerType: CheckerType.COURSE_CREATOR, course: { lecturerId: checkerId } }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Submissions where I am the Immediate Superior
    const asSuperior = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        user: { immediateSuperiorId: checkerId },
        module: { checkerType: CheckerType.IMMEDIATE_SUPERIOR }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Combine and remove duplicates
    const all = [...specific, ...asCreator, ...asSuperior];
    const uniqueIds = new Set();
    return all.filter(s => {
      if (uniqueIds.has(s.id)) return false;
      uniqueIds.add(s.id);
      return true;
    });
  }

  static async reviewSubmission(submissionId: string, checkerId: string, data: { status: SubmissionStatus; feedback?: string }) {
    const submission = await prisma.activitySubmission.update({
      where: { id: submissionId },
      data: {
        status: data.status,
        feedback: data.feedback,
        reviewedAt: new Date()
      },
      include: { module: { include: { course: true } } }
    });

    // Notify Student
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        message: `Your activity for "${submission.module.title}" has been ${data.status.toLowerCase()}.`,
        link: `/learning/course/${submission.module.courseId}`
      }
    });

    return submission;
  }

  static async getSubmission(userId: string, moduleId: string) {
    return prisma.activitySubmission.findFirst({
      where: { userId, moduleId }
    });
  }
}
