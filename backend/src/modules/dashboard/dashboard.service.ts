import { prisma } from '../../lib/prisma';
import { Role, CourseStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import { getS2SToken } from '../../services/zoom.service';

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

  private static async verifySmtpConnection(): Promise<boolean> {
    try {
      if (process.env.MOCK_EMAIL === 'true') {
        return true;
      }
      const settings = await prisma.systemSettings.findFirst();
      const isDbConfigured = settings?.smtpServer && settings?.smtpServer !== 'smtp.example.com' && settings?.smtpUser;
      
      const transporter = nodemailer.createTransport({
        host: isDbConfigured ? settings.smtpServer : 'smtp.gmail.com',
        port: isDbConfigured ? settings.smtpPort : 465,
        secure: isDbConfigured ? (settings.smtpPort === 465) : true,
        auth: {
          user: isDbConfigured ? settings.smtpUser : process.env.SMTP_USER,
          pass: isDbConfigured ? settings.smtpPassword : process.env.SMTP_APP_PASSWORD,
        },
        connectionTimeout: 3000
      } as any);

      await transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP Connection Verify Failed:', error);
      return false;
    }
  }

  private static async verifyZoomConnection(): Promise<boolean> {
    try {
      const accountId = process.env.ZOOM_S2S_ACCOUNT_ID;
      const clientId = process.env.ZOOM_S2S_CLIENT_ID;
      const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;

      if (!accountId || !clientId || !clientSecret) {
        return false;
      }
      await getS2SToken();
      return true;
    } catch (error) {
      console.error('Zoom Connection Verify Failed:', error);
      return false;
    }
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

    // Failed Logins (24h)
    const failedLoginsCount = await prisma.auditLog.count({
      where: {
        action: 'USER_LOGIN_FAILED',
        timestamp: { gte: oneDayAgo }
      }
    });

    // Calculate active and upcoming batches
    const activeBatchesCount = await prisma.batch.count({ where: { status: 'ACTIVE' } });
    const upcomingBatchesCount = await prisma.batch.count({ where: { status: 'UPCOMING' } });

    // Calculate pending reviews (awaiting grading)
    const pendingSubmissions = await prisma.activitySubmission.count({ where: { status: 'PENDING_REVIEW' } });
    const pendingEssays = await prisma.essaySubmission.count({ where: { status: 'PENDING_REVIEW' } });
    const totalPending = pendingSubmissions + pendingEssays;

    // Total Enrollments & Completion Rate
    const totalEnrollments = await prisma.enrollment.count();
    const completedCount = await prisma.enrollment.count({ where: { status: 'COMPLETED' } });
    const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;
    const certsCount = await prisma.transcript.count();

    // Verify SMTP and Zoom Connection status concurrently
    const [smtpConnected, zoomConnected] = await Promise.all([
      this.verifySmtpConnection().catch(() => false),
      this.verifyZoomConnection().catch(() => false)
    ]);

    // Calculate 7-day system activity chart data
    const activityChart: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const logins = await prisma.auditLog.count({
        where: {
          action: 'USER_LOGIN',
          timestamp: { gte: date, lt: nextDate }
        }
      });

      const actions = await prisma.auditLog.count({
        where: {
          action: { not: 'USER_LOGIN' },
          timestamp: { gte: date, lt: nextDate }
        }
      });

      const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      activityChart.push({
        date: dateString,
        logins,
        actions
      });
    }

    return {
      metrics: [
        { label: 'Active Sessions (24h)', value: activeCount.toString(), growth },
        { 
          label: 'Failed Logins (24h)', 
          value: failedLoginsCount.toString(), 
          growth: failedLoginsCount > 0 ? 'ACTION REQUIRED' : 'GOOD' 
        },
        { 
          label: 'Active Batches', 
          value: activeBatchesCount.toString(), 
          growth: upcomingBatchesCount > 0 ? `+${upcomingBatchesCount} upcoming` : '0 upcoming' 
        },
        { 
          label: 'Awaiting Grading', 
          value: totalPending.toString(), 
          growth: totalPending > 0 ? 'ACTION REQUIRED' : 'ON TRACK' 
        },
        { label: 'Total Enrollments', value: totalEnrollments.toString(), growth: `+${totalEnrollments} total` },
        { label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, growth: `+${certsCount} certs` }
      ],
      systemStatus: {
        smtpConfigured: smtpConnected,
        zoomConfigured: zoomConnected,
        databaseConnected: true
      },
      activityChart
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
