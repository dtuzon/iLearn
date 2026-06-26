import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, SubmissionStatus, CheckerType, Role } from '@prisma/client';

import { sendActivityUpdateEmail, sendActivitySubmissionEmail } from '../../lib/email-service';
import { NotificationsService } from '../notifications/notifications.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';


export class WorkshopsService {
  static async submitWorkshop(userId: string, moduleId: string, data: { fileUrl?: string; textResponse?: string }) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: module.courseId } }
    });

    if (!enrollment) throw new Error('You are not enrolled in this course.');

    // Find existing submission or create new one using the unique constraint [userId, moduleId]
    const submission = await prisma.activitySubmission.upsert({
      where: {
        user_module_submission: { userId, moduleId }
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
    await prisma.moduleProgress.upsert({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
      update: { completed: true, completedAt: new Date(), submittedAt: new Date() },
      create: { enrollmentId: enrollment.id, moduleId, completed: true, completedAt: new Date(), submittedAt: new Date() }
    });
    await EnrollmentsService.updateEnrollmentCompletionState(prisma, userId, module.courseId);

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
      const checker = await prisma.user.findUnique({ where: { id: checkerId } });
      const studentName = `${student?.firstName} ${student?.lastName}`;
      const title = 'New Activity Submission';
      const message = `${studentName} submitted an activity for ${module.course.title}`;
      const actionUrl = '/approvals/activities';

      await NotificationsService.createNotification({
        userId: checkerId,
        title,
        message,
        link: actionUrl
      });

      if (checker?.email) {
        const fullActionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}${actionUrl}`;
        await sendActivitySubmissionEmail(
          checker.email,
          studentName,
          module.course.title,
          fullActionUrl
        );
      }
    }
  }


  static async getPendingSubmissions(checkerId: string, role: Role) {
    // 1. Global view for Admins and Learning Managers
    if (role === Role.ADMINISTRATOR || role === Role.LEARNING_MANAGER) {
      return prisma.activitySubmission.findMany({
        where: { status: SubmissionStatus.PENDING },
        include: { 
          user: true, 
          module: { include: { course: true } },
          assignedChecker: true
        },
        orderBy: { submittedAt: 'desc' }
      });
    }

    // 2. Derive logic for others
    
    // Explicitly assigned to me
    const explicitlyAssigned = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        assignedCheckerId: checkerId
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Submissions where I am the Specific Checker (and no explicit override)
    const specific = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        assignedCheckerId: null,
        module: { checkerType: CheckerType.SPECIFIC_USER, specificCheckerId: checkerId }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Submissions where I am the Course Creator (and no explicit override)
    const asCreator = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        assignedCheckerId: null,
        module: { checkerType: CheckerType.COURSE_CREATOR, course: { lecturerId: checkerId } }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Submissions where I am the Immediate Superior (and no explicit override)
    const asSuperior = await prisma.activitySubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING,
        assignedCheckerId: null,
        user: { immediateSuperiorId: checkerId },
        module: { checkerType: CheckerType.IMMEDIATE_SUPERIOR }
      },
      include: { user: true, module: { include: { course: true } } }
    });

    // Combine and remove duplicates
    const all = [...explicitlyAssigned, ...specific, ...asCreator, ...asSuperior];
    const uniqueIds = new Set();
    return all.filter(s => {
      if (uniqueIds.has(s.id)) return false;
      uniqueIds.add(s.id);
      return true;
    });
  }

  static async reassignSubmission(submissionId: string, newCheckerId: string, adminId: string) {
    const submission = await prisma.activitySubmission.update({
      where: { id: submissionId },
      data: { assignedCheckerId: newCheckerId },
      include: { 
        module: { include: { course: true } },
        user: true
      }
    });

    const newChecker = await prisma.user.findUnique({ where: { id: newCheckerId } });
    const studentName = `${submission.user.firstName} ${submission.user.lastName}`;

    // Notify the new checker
    await NotificationsService.createNotification({
      userId: newCheckerId,
      title: 'Activity Reassigned to You',
      message: `Admin reassigned ${studentName}'s activity for "${submission.module.course.title}" to you.`,
      link: '/approvals/activities'
    });

    if (newChecker?.email) {
      const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}/approvals/activities`;
      await sendActivitySubmissionEmail(
        newChecker.email,
        studentName,
        submission.module.course.title,
        actionUrl
      );
    }

    return submission;
  }

  static async reviewSubmission(submissionId: string, checkerId: string, data: { status: SubmissionStatus; feedback?: string }) {
    const submission = await prisma.activitySubmission.findUnique({
      where: { id: submissionId },
      include: { 
        module: { include: { course: true } },
        user: true
      }
    });

    if (!submission) throw new Error('Submission not found');

    const checker = await prisma.user.findUnique({
      where: { id: checkerId },
      select: { role: true }
    });

    if (!checker) throw new Error('Checker not found');

    const isAdminOrManager = checker.role === Role.ADMINISTRATOR || checker.role === Role.LEARNING_MANAGER;

    if (!isAdminOrManager) {
      if (submission.assignedCheckerId) {
        if (submission.assignedCheckerId !== checkerId) {
          throw new Error('Unauthorized: You are not the assigned checker for this submission.');
        }
      } else {
        const module = submission.module;
        if (module.checkerType === CheckerType.SPECIFIC_USER) {
          if (module.specificCheckerId !== checkerId) {
            throw new Error('Unauthorized: You are not the specific checker for this module.');
          }
        } else if (module.checkerType === CheckerType.COURSE_CREATOR) {
          if (module.course.lecturerId !== checkerId) {
            throw new Error('Unauthorized: You are not the lecturer/creator for this course.');
          }
        } else if (module.checkerType === CheckerType.IMMEDIATE_SUPERIOR) {
          if (submission.user.immediateSuperiorId !== checkerId) {
            throw new Error('Unauthorized: You are not the immediate superior of this student.');
          }
        } else {
          throw new Error('Unauthorized: No checker mapping matches your profile.');
        }
      }
    }

    const updated = await prisma.activitySubmission.update({
      where: { id: submissionId },
      data: {
        status: data.status,
        feedback: data.feedback,
        gradedAt: new Date(),
        gradedById: checkerId
      },
      include: { module: { include: { course: true } } }
    });
    
    await EnrollmentsService.updateEnrollmentCompletionState(prisma, updated.userId, updated.module.courseId);

    // Notify Student
    const user = await prisma.user.findUnique({ where: { id: updated.userId } });
    const isApproved = data.status === SubmissionStatus.APPROVED;
    const title = isApproved ? 'Activity Approved!' : 'Action Required: Activity Rejected';
    const message = isApproved 
      ? `Your submission for "${updated.module.course.title}" has been approved.` 
      : `Your submission for "${updated.module.course.title}" requires changes. Feedback: ${data.feedback}`;
    const actionUrl = `/learning/course/${updated.module.courseId}`;
    await NotificationsService.createNotification({

      userId: updated.userId,
      title,
      message,
      link: actionUrl
    });


    if (user?.email) {
      const fullActionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'}${actionUrl}`;
      await sendActivityUpdateEmail(
        user.email,
        data.status as 'APPROVED' | 'REJECTED',
        updated.module.course.title,

        data.feedback,
        fullActionUrl
      );
    }

    return updated;
  }


  static async getSubmission(userId: string, moduleId: string) {
    return prisma.activitySubmission.findFirst({
      where: { userId, moduleId }
    });
  }
}
