import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { EnrollmentStatus } from '@prisma/client';
import { differenceInDays, startOfDay } from 'date-fns';

export function initDeadlineWorker() {
  // 1. ESCALATION ENGINE (Upcoming Reminders) - Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🔄 [CRON] Running Multi-Tiered Escalation Engine...');
    try {
      await processTieredReminders();
    } catch (error) {
      console.error('❌ [CRON] Critical error in escalation engine:', error);
    }
  });

  // 2. OVERDUE TRACKER (Daily at 1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 [CRON] Running Overdue Assignment Tracker...');
    try {
      await processOverdueAlerts();
    } catch (error) {
      console.error('❌ [CRON] Critical error in overdue tracker:', error);
    }
  });

  console.log('🚀 [CRON] Deadline & Escalation Workers initialized.');
}

async function processTieredReminders() {
  const today = startOfDay(new Date());

  // Courses
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: { in: [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.NOT_STARTED] },
      dueDate: { not: null }
    },
    include: { user: true, course: true }
  });

  for (const e of enrollments) {
    await evaluateEscalation(e, 'COURSE', today);
  }

  // Paths
  const pathEnrollments = await prisma.learningPathEnrollment.findMany({
    where: {
      status: { in: [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.NOT_STARTED] },
      dueDate: { not: null }
    },
    include: { user: true, learningPath: true }
  });

  for (const pe of pathEnrollments) {
    await evaluateEscalation(pe, 'PATH', today);
  }
}

async function evaluateEscalation(enrollment: any, type: 'COURSE' | 'PATH', today: Date) {
  const dueDate = startOfDay(new Date(enrollment.dueDate));
  const daysRemaining = differenceInDays(dueDate, today);
  const title = type === 'COURSE' ? enrollment.course.title : enrollment.learningPath.title;
  const user = enrollment.user;
  const link = type === 'COURSE' ? `/learning/course/${enrollment.courseId}` : `/learning/paths/${enrollment.learningPathId}`;

  try {
    // TIER 1: 7 Days Out (In-App Only)
    if (daysRemaining === 7 && !enrollment.reminder7DaySentAt) {
      await notifyUser(user.id, 'Upcoming Deadline', `"${title}" is due in 7 days.`, 'INFO', link);
      await updateTracking(enrollment.id, type, { reminder7DaySentAt: new Date() });
    }

    // TIER 2: 3 Days Out (In-App + Email)
    else if (daysRemaining === 3 && !enrollment.reminder3DaySentAt) {
      await notifyUser(user.id, 'Action Required', `"${title}" is due in 3 days. Please resume your learning.`, 'WARNING', link);
      await sendReminderEmail(user, title, 3, false);
      await updateTracking(enrollment.id, type, { reminder3DaySentAt: new Date() });
    }

    // TIER 3: 1 Day Out (Critical In-App + Email + CC Supervisor)
    else if (daysRemaining === 1 && !enrollment.reminder1DaySentAt) {
      await notifyUser(user.id, 'Final Reminder', `"${title}" is due tomorrow. Immediate completion is required.`, 'CRITICAL', link);
      
      let supervisorEmail = null;
      if (user.immediateSuperiorId) {
        const superior = await prisma.user.findUnique({ where: { id: user.immediateSuperiorId } });
        supervisorEmail = superior?.email;
      }
      
      await sendReminderEmail(user, title, 1, true, supervisorEmail);
      await updateTracking(enrollment.id, type, { reminder1DaySentAt: new Date() });
    }
  } catch (err) {
    console.error(`Reminders failed for ${user.id} on ${title}:`, err);
  }
}

async function processOverdueAlerts() {
  const now = new Date();

  // Courses
  const overdueCourses = await prisma.enrollment.findMany({
    where: {
      status: { not: EnrollmentStatus.COMPLETED },
      dueDate: { lt: now },
      overdueAlertSentAt: null
    },
    include: { user: true, course: true }
  });

  for (const e of overdueCourses) {
    await sendOverdueAlert(e, 'COURSE');
  }

  // Paths
  const overduePaths = await prisma.learningPathEnrollment.findMany({
    where: {
      status: { not: EnrollmentStatus.COMPLETED },
      dueDate: { lt: now },
      overdueAlertSentAt: null
    },
    include: { user: true, learningPath: true }
  });

  for (const pe of overduePaths) {
    await sendOverdueAlert(pe, 'PATH');
  }
}

async function sendOverdueAlert(enrollment: any, type: 'COURSE' | 'PATH') {
  const title = type === 'COURSE' ? enrollment.course.title : enrollment.learningPath.title;
  const user = enrollment.user;
  const link = type === 'COURSE' ? `/learning/course/${enrollment.courseId}` : `/learning/paths/${enrollment.learningPathId}`;

  try {
    await notifyUser(user.id, 'Assignment Overdue', `"${title}" is now overdue. Please complete as soon as possible.`, 'ACTION_REQUIRED', link);
    
    await sendEmail({
      to: user.email,
      subject: `URGENT: "${title}" is Overdue`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff5f5;">
          <h2 style="color: #DC2626;">Assignment Overdue</h2>
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>Our records show that <strong>"${title}"</strong> was due on <strong>${new Date(enrollment.dueDate).toLocaleDateString()}</strong> and is now overdue.</p>
          <p>Please prioritize this assignment today for compliance tracking.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete Assignment</a>
          </div>
        </div>
      `
    });

    await updateTracking(enrollment.id, type, { overdueAlertSentAt: new Date() });
  } catch (err) {
    console.error(`Overdue alert failed for ${user.id}:`, err);
  }
}

async function notifyUser(userId: string, title: string, message: string, type: string, link: string) {
  await prisma.notification.create({
    data: { userId, title, message, type, link }
  });
}

async function updateTracking(id: string, type: 'COURSE' | 'PATH', data: any) {
  if (type === 'COURSE') {
    await prisma.enrollment.update({ where: { id }, data });
  } else {
    await prisma.learningPathEnrollment.update({ where: { id }, data });
  }
}

async function sendReminderEmail(user: any, title: string, days: number, isCritical: boolean, ccEmail?: string | null) {
  const color = isCritical ? '#DC2626' : '#F59E0B';
  const urgency = days === 1 ? 'is due TOMORROW' : `is due in ${days} days`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: ${color};">${isCritical ? 'URGENT: Final Reminder' : 'Upcoming Deadline'}</h2>
      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>This is a reminder that your assigned course <strong>"${title}"</strong> ${urgency}.</p>
      ${isCritical ? '<p style="font-weight: bold; color: #DC2626;">Immediate completion is required.</p>' : '<p>Please ensure completion by the target date.</p>'}
      <div style="margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Resume Learning</a>
      </div>
      ${ccEmail ? `<p style="font-size: 11px; color: #999; margin-top: 30px;">Cc: Supervisor (${ccEmail})</p>` : ''}
    </div>
  `;

  const recipients = [user.email];
  if (ccEmail) recipients.push(ccEmail);

  for (const to of recipients) {
    if (!to) continue;
    await sendEmail({ to, subject: `${isCritical ? 'URGENT: ' : ''}Reminder: "${title}" is due soon`, html });
  }
}
