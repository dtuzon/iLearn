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
    
    const totalEnrollments = await prisma.enrollment.findMany({ where: { userId } });
    const completedCount = totalEnrollments.filter(e => e.status === 'COMPLETED').length;
    const completionRate = totalEnrollments.length > 0 ? (completedCount / totalEnrollments.length) * 100 : 0;

    return {
      metrics: [
        { label: 'My Enrolled Courses', value: enrolled.toString(), growth: '+0%' },
        { label: 'My Certificates', value: certificates.toString(), growth: '+0%' },
        { label: 'Overall Completion', value: `${completionRate.toFixed(1)}%`, growth: '+0%' }
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
    const usersCount = await prisma.user.count();
    const coursesCount = await prisma.course.count({ where: { isLatest: true } });
    
    return {
      metrics: [
        { label: 'Global Platform Health', value: '99.9%', growth: '+0.01%' },
        { label: 'Total Users', value: usersCount.toString(), growth: '+2%' },
        { label: 'Total Content', value: coursesCount.toString(), growth: '+5%' }
      ]
    };
  }

  private static async getSupervisorMetrics(userId: string) {
    const subordinates = await prisma.user.findMany({ where: { immediateSuperiorId: userId }, select: { id: true } });
    const subIds = subordinates.map(s => s.id);
    
    const totalEnrollments = await prisma.enrollment.count({ where: { userId: { in: subIds } } });
    const completedCount = await prisma.enrollment.count({ where: { userId: { in: subIds }, status: 'COMPLETED' } });
    const complianceRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;

    return {
      metrics: [
        { label: 'Team Compliance %', value: `${complianceRate.toFixed(1)}%`, growth: '+0%' },
        { label: 'Overdue Team Tasks', value: '0', growth: '+0%' },
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
