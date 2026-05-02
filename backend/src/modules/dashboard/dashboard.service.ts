import { prisma } from '../../lib/prisma';
import { Role, CourseStatus, EnrollmentStatus } from '@prisma/client';

export class DashboardService {
  static async getMetrics(userId: string, role: string, departmentId?: string) {
    switch (role) {
      case Role.EMPLOYEE:
        return this.getEmployeeMetrics(userId);
      case Role.COURSE_CREATOR:
        return this.getCreatorMetrics(userId);
      case Role.LEARNING_MANAGER:
        return this.getManagerMetrics();
      case Role.ADMINISTRATOR:
        return this.getAdminMetrics();
      case Role.SUPERVISOR:
        return this.getSupervisorMetrics(userId);
      case Role.DEPARTMENT_HEAD:
        return this.getDepartmentHeadMetrics(departmentId);
      default:
        throw new Error('Unauthorized role for metrics');
    }
  }

  private static async getEmployeeMetrics(userId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { status: true }
    });

    const activeCoursesCount = enrollments.filter(e => e.status === EnrollmentStatus.IN_PROGRESS).length;
    const completedCoursesCount = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;

    const recentEnrollment = await prisma.enrollment.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { course: { select: { title: true, id: true } } }
    });

    // Simple count for pending evals (not highly detailed here, but placeholder)
    const pendingEvaluations = 0; 

    return {
      activeCoursesCount,
      completedCoursesCount,
      recentCourse: recentEnrollment?.course || null,
      pendingEvaluations
    };
  }

  private static async getCreatorMetrics(userId: string) {
    const authoredCoursesCount = await prisma.course.count({
      where: { lecturerId: userId, isLatest: true }
    });

    const totalLearners = await prisma.enrollment.count({
      where: { course: { lecturerId: userId } }
    });

    const draftCourses = await prisma.course.findMany({
      where: { lecturerId: userId, status: CourseStatus.DRAFT, isLatest: true },
      select: { id: true, title: true, version: true }
    });

    return {
      authoredCoursesCount,
      totalLearners,
      draftCourses
    };
  }

  private static async getManagerMetrics() {
    const pendingApprovalsCount = await prisma.course.count({
      where: { status: CourseStatus.PENDING_APPROVAL, isLatest: true }
    });

    const pendingWorkshopGradesCount = await prisma.activitySubmission.count({
      where: { status: 'PENDING' }
    });

    const pending180DayEvals = await prisma.course.count({
        where: { requires180DayEval: true }
    });

    return {
      pendingApprovalsCount,
      pendingWorkshopGradesCount,
      pending180DayEvals
    };
  }

  private static async getAdminMetrics() {
    const totalUsers = await prisma.user.count();
    const totalPublishedCourses = await prisma.course.count({
      where: { status: CourseStatus.PUBLISHED, isLatest: true }
    });

    // Completion rate across all enrollments
    const totalEnrollments = await prisma.enrollment.count();
    const completedEnrollments = await prisma.enrollment.count({
      where: { status: EnrollmentStatus.COMPLETED }
    });

    const overallCompletionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100) 
      : 0;

    return {
      totalUsers,
      totalPublishedCourses,
      overallCompletionRate
    };
  }

  private static async getSupervisorMetrics(userId: string) {
    const subordinates = await prisma.user.findMany({
      where: { immediateSuperiorId: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        enrollments: {
            select: { status: true }
        }
      }
    });

    const teamProgress = subordinates.map(sub => {
        const total = sub.enrollments.length;
        const completed = sub.enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
        return {
            id: sub.id,
            name: `${sub.firstName} ${sub.lastName}`,
            totalCourses: total,
            completedCourses: completed,
            complianceRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    });

    const teamComplianceRate = teamProgress.length > 0 
        ? Math.round(teamProgress.reduce((acc, curr) => acc + curr.complianceRate, 0) / teamProgress.length)
        : 0;

    return {
      teamComplianceRate,
      overdueTeamCoursesCount: 0, // Placeholder for logic check
      pendingEvaluationsToComplete: 0,
      teamProgress
    };
  }

  private static async getDepartmentHeadMetrics(departmentId?: string) {
    if (!departmentId) return { departmentComplianceRate: 0, totalDepartmentLearners: 0, overdueDepartmentCoursesCount: 0 };

    const totalDepartmentLearners = await prisma.user.count({
      where: { departmentId }
    });

    const enrollments = await prisma.enrollment.findMany({
        where: { user: { departmentId } },
        select: { status: true }
    });

    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;

    const departmentComplianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      departmentComplianceRate,
      totalDepartmentLearners,
      overdueDepartmentCoursesCount: 0
    };
  }
}
