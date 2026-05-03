import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { EnrollmentStatus } from '@prisma/client';

export function initDeadlineWorker() {
  // OVERDUE TRACKER (Daily at 1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 [CRON] Running Overdue Assignment Tracker...');
    
    try {
      const now = new Date();

      // 1. Course Enrollments
      const overdueCourses = await prisma.enrollment.findMany({
        where: {
          status: { not: EnrollmentStatus.COMPLETED },
          dueDate: { lt: now },
          overdueAlertSentAt: null
        },
        include: { user: true, course: true }
      });

      for (const e of overdueCourses) {
        await processOverdueAlert(e, 'COURSE');
      }

      // 2. Learning Path Enrollments
      const overduePaths = await prisma.learningPathEnrollment.findMany({
        where: {
          status: { not: EnrollmentStatus.COMPLETED },
          dueDate: { lt: now },
          overdueAlertSentAt: null
        },
        include: { user: true, learningPath: true }
      });

      for (const e of overduePaths) {
        await processOverdueAlert(e, 'PATH');
      }

    } catch (error) {
      console.error('❌ [CRON] Critical error in overdue worker:', error);
    }
  });

  console.log('🚀 [CRON] Overdue Alert Worker scheduled (Daily at 1:00 AM).');
}

async function processOverdueAlert(enrollment: any, type: 'COURSE' | 'PATH') {
  const title = type === 'COURSE' ? enrollment.course.title : enrollment.learningPath.title;
  const userId = enrollment.userId;

  try {
    // Notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Assignment Overdue',
        message: `Your assignment "${title}" is now overdue. Please complete it as soon as possible for compliance.`,
        type: 'ACTION_REQUIRED',
        link: type === 'COURSE' ? `/learning/course/${enrollment.courseId}` : `/learning/paths/${enrollment.learningPathId}`
      }
    });

    // Email
    await sendEmail({
      to: enrollment.user.email,
      subject: `URGENT: "${title}" is Overdue`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff5f5;">
          <h2 style="color: #DC2626;">Assignment Overdue</h2>
          <p>Hello <strong>${enrollment.user.firstName}</strong>,</p>
          <p>Our records show that <strong>"${title}"</strong> was due on <strong>${new Date(enrollment.dueDate).toLocaleDateString()}</strong> and is now overdue.</p>
          <p>Failure to complete assigned training may impact your compliance status. Please prioritize this assignment today.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete Assignment</a>
          </div>
        </div>
      `
    });

    // Update tracking
    if (type === 'COURSE') {
      await prisma.enrollment.update({ where: { id: enrollment.id }, data: { overdueAlertSentAt: new Date() } });
    } else {
      await prisma.learningPathEnrollment.update({ where: { id: enrollment.id }, data: { overdueAlertSentAt: new Date() } });
    }
  } catch (err) {
    console.error(`Error processing overdue for ${userId}:`, err);
  }
}
