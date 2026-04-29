import { prisma } from '../../lib/prisma';
import { EnrollmentStatus } from '@prisma/client';

export class WorkshopsService {
  static async submitWorkshop(userId: string, moduleId: string, fileUrl: string) {
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

    // Update progress to Pending Grading
    const progress = await prisma.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId: enrollment.id,
          moduleId
        }
      },
      update: {
        fileUrl,
        submittedAt: new Date(),
        completed: false
      },
      create: {
        enrollmentId: enrollment.id,
        moduleId,
        fileUrl,
        submittedAt: new Date(),
        completed: false
      }
    });

    // Update enrollment status if needed
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.PENDING_GRADING }
    });

    // Notify COURSE_CREATOR
    const student = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.notification.create({
      data: {
        userId: module.course.lecturerId,
        message: `New workshop submission from ${student?.firstName} ${student?.lastName} for course: ${module.course.title}`,
        link: `/creator/grading/${moduleId}`
      }
    });

    return progress;
  }

  static async gradeWorkshop(moduleId: string, enrollmentId: string, data: { completed: boolean; gradeNote?: string; gradedBy: string }) {
    return prisma.moduleProgress.update({
      where: {
        enrollmentId_moduleId: {
          enrollmentId,
          moduleId
        }
      },
      data: {
        completed: data.completed,
        completedAt: data.completed ? new Date() : undefined,
        gradeNote: data.gradeNote,
        gradedBy: data.gradedBy
      }
    });
  }
}
