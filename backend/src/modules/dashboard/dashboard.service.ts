import { prisma } from '../../lib/prisma';
import { Role, CourseStatus } from '@prisma/client';

export class DashboardService {
  static async getMetrics(userId: string, role: Role) {
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
        return this.getDeptHeadMetrics(userId);
      default:
        return { metrics: [] };
    }
  }

  private static async getEmployeeMetrics(userId: string) {
    const enrolled = await prisma.enrollment.count({ where: { userId } });
    const certificates = await prisma.transcript.count({ where: { userId } });
    
    const overdueCount = await prisma.enrollment.count({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    }) + await prisma.learningPathEnrollment.count({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    });

    return {
      metrics: [
        { label: 'My Enrolled Courses', value: enrolled.toString(), growth: '+0%' },
        { label: 'My Certificates', value: certificates.toString(), growth: '+0%' },
        { label: 'Overdue Assignments', value: overdueCount.toString(), growth: overdueCount > 0 ? 'ACTION REQUIRED' : 'ON TRACK' }
      ]
    };
  }

  private static async getCreatorMetrics(userId: string) {
    const drafts = await prisma.course.count({ where: { lecturerId: userId, status: CourseStatus.DRAFT } });
    const active = await prisma.course.count({ where: { lecturerId: userId, status: CourseStatus.PUBLISHED, isLatest: true } });
    const learners = await prisma.enrollment.count({ where: { course: { lecturerId: userId } } });

    return {
      metrics: [
        { label: 'My Draft Courses', value: drafts.toString(), growth: '+0%' },
        { label: 'My Active Courses', value: active.toString(), growth: '+0%' },
        { label: 'Total Learners', value: learners.toString(), growth: '+0%' }
      ]
    };
  }

  private static async getManagerMetrics() {
    const totalLearners = await prisma.user.count({ where: { role: Role.EMPLOYEE } });
    const awaiting = await prisma.course.count({ where: { status: CourseStatus.PENDING_APPROVAL } });
    
    const totalEnrollments = await prisma.enrollment.count();
    const completedCount = await prisma.enrollment.count({ where: { status: 'COMPLETED' } });
    const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;

    return {
      metrics: [
        { label: 'Global Completion Rate', value: `${completionRate.toFixed(1)}%`, growth: '+0%' },
        { label: 'Total Learners', value: totalLearners.toString(), growth: '+0%' },
        { label: 'Awaiting Approval', value: awaiting.toString(), growth: '+0%' }
      ]
    };
  }

  private static async getAdminMetrics() {
    // Calculate active logins in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeLogins = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        action: 'USER_LOGIN',
        timestamp: { gte: oneDayAgo },
        userId: { not: null }
      }
    });
    const activeCount = activeLogins.length;

    // Calculate active logins in the preceding 24 hours for growth percentage
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const precedingLogins = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        action: 'USER_LOGIN',
        timestamp: { gte: twoDaysAgo, lt: oneDayAgo },
        userId: { not: null }
      }
    });
    const precedingCount = precedingLogins.length;

    let growth = '+0%';
    if (precedingCount === 0) {
      if (activeCount > 0) {
        growth = `+${activeCount}`;
      } else {
        growth = '0%';
      }
    } else {
      const pct = ((activeCount - precedingCount) / precedingCount) * 100;
      growth = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    // Calculate active and upcoming batches
    const activeBatchesCount = await prisma.batch.count({ where: { status: 'ACTIVE' } });
    const upcomingBatchesCount = await prisma.batch.count({ where: { status: 'UPCOMING' } });

    // Calculate pending reviews (awaiting grading)
    const pendingSubmissions = await prisma.activitySubmission.count({ where: { status: 'PENDING_REVIEW' } });
    const pendingEssays = await prisma.essaySubmission.count({ where: { status: 'PENDING_REVIEW' } });
    const totalPending = pendingSubmissions + pendingEssays;

    return {
      metrics: [
        { label: 'Active Sessions (24h)', value: activeCount.toString(), growth },
        { 
          label: 'Active Batches', 
          value: activeBatchesCount.toString(), 
          growth: upcomingBatchesCount > 0 ? `+${upcomingBatchesCount} upcoming` : '0 upcoming' 
        },
        { 
          label: 'Awaiting Grading', 
          value: totalPending.toString(), 
          growth: totalPending > 0 ? 'ACTION REQUIRED' : 'ON TRACK' 
        }
      ]
    };
  }

  private static async getSupervisorMetrics(userId: string) {
    const subordinates = await prisma.user.findMany({ where: { immediateSuperiorId: userId }, select: { id: true } });
    const subIds = subordinates.map(s => s.id);
    
    const totalEnrollments = await prisma.enrollment.count({ where: { userId: { in: subIds } } });
    const completedCount = await prisma.enrollment.count({ where: { userId: { in: subIds }, status: 'COMPLETED' } });
    const complianceRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;

    const overdueTasks = await prisma.enrollment.count({
      where: {
        userId: { in: subIds },
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    }) + await prisma.learningPathEnrollment.count({
      where: {
        userId: { in: subIds },
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    });

    return {
      metrics: [
        { label: 'Team Compliance %', value: `${complianceRate.toFixed(1)}%`, growth: '+0%' },
        { label: 'Overdue Team Tasks', value: overdueTasks.toString(), growth: overdueTasks > 0 ? 'NEEDS ATTENTION' : 'GOOD' },
        { label: 'Overdue Team Evals', value: '0', growth: '+0%' }
      ]
    };
  }

  private static async getDeptHeadMetrics(userId: string) {
    const dept = await prisma.department.findFirst({ where: { headUserId: userId } });
    if (!dept) return { metrics: [] };

    const totalLearners = await prisma.user.count({ where: { departmentId: dept.id } });
    
    const totalEnrollments = await prisma.enrollment.count({ where: { user: { departmentId: dept.id } } });
    const completedCount = await prisma.enrollment.count({ where: { user: { departmentId: dept.id }, status: 'COMPLETED' } });
    const complianceRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;

    return {
      metrics: [
        { label: 'Dept. Compliance %', value: `${complianceRate.toFixed(1)}%`, growth: '+0%' },
        { label: 'Learners in Dept.', value: totalLearners.toString(), growth: '+0%' },
        { label: 'Dept Readiness', value: '85%', growth: '+2%' }
      ]
    };
  }
}
