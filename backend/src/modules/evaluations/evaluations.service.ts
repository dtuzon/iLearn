import { prisma } from '../../lib/prisma';
import { EnrollmentStatus } from '@prisma/client';

export class EvaluationsService {
  static async getPendingTeamEvaluations(supervisorId: string) {
    // 1. Get subordinates
    const subordinates = await prisma.user.findMany({
      where: { immediateSuperiorId: supervisorId },
      select: { id: true, firstName: true, lastName: true }
    });

    const subordinateIds = subordinates.map(s => s.id);

    // 2. Find completed enrollments for these subordinates where course requires evaluation
    // and evaluation hasn't been done yet
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: { in: subordinateIds },
        status: EnrollmentStatus.COMPLETED,
        course: { requires180DayEval: true },
        // We check if a BehavioralEvaluation already exists for this user and course
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, title: true } }
      }
    });

    // 3. Filter out those that already have evaluations
    const pending = [];
    for (const enrollment of enrollments) {
      const existingEval = await prisma.behavioralEvaluation.findFirst({
        where: {
          employeeId: enrollment.userId,
          courseId: enrollment.courseId
        }
      });
      if (!existingEval) {
        pending.push({
          id: enrollment.id,
          employeeId: enrollment.userId,
          employeeName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
          courseId: enrollment.courseId,
          courseName: enrollment.course.title,
          completionDate: enrollment.updatedAt
        });
      }
    }

    return pending;
  }

  static async submitBehavioralEvaluation(supervisorId: string, data: any) {
    const { employeeId, courseId, moduleRatings, overallImpact } = data;

    return prisma.behavioralEvaluation.create({
      data: {
        evaluatorId: supervisorId,
        employeeId,
        courseId,
        moduleRatings,
        overallImpact
      }
    });
  }
}
