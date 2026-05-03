import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { EnrollmentStatus, Role } from '@prisma/client';
import { differenceInDays, startOfDay } from 'date-fns';

export function initEscalationWorker() {
  // Run every morning at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🔄 [CRON] Running Multi-Tiered Escalation Engine...');
    
    try {
      await processTieredReminders();
    } catch (error) {
      console.error('❌ [CRON] Critical error in escalation worker:', error);
    }
  });

  console.log('🚀 [CRON] Multi-Tiered Escalation Engine scheduled (Daily at 8:00 AM).');
}

async function processTieredReminders() {
  const now = startOfDay(new Date());

  // 1. Process Courses
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      status: { in: [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.NOT_STARTED] },
      dueDate: { not: null }
    },
    include: { user: true, course: true }
  });

  for (const e of activeEnrollments) {
    await evaluateAndNotify(e, 'COURSE', now);
  }

  // 2. Process Learning Paths
  const activePaths = await prisma.learningPathEnrollment.findMany({
    where: {
      status: { in: [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.NOT_STARTED] },
      dueDate: { not: null }
    },
    include: { user: true, learningPath: true }
  });

  for (const e of activePaths) {
    await evaluateAndNotify(e, 'PATH', now);
  }
}

async function evaluateAndNotify(enrollment: any, type: 'COURSE' | 'PATH', today: Date) {
  const dueDate = startOfDay(new Date(enrollment.dueDate));
  const daysRemaining = differenceInDays(dueDate, today);
  const title = type === 'COURSE' ? enrollment.course.title : enrollment.learningPath.title;
  const user = enrollment.user;
  const link = type === 'COURSE' ? `/learning/course/${enrollment.courseId}` : `/learning/paths/${enrollment.learningPathId}`;

  try {
    // TIER 1: 7 Days Out (INFO - In-App Only)
    if (daysRemaining === 7 && !enrollment.reminder7DaySentAt) {
      await sendTierNotification(user.id, 'Upcoming Deadline', `Your assignment "${title}" is due in 7 days.`, 'INFO', link);
      await updateTracking(enrollment.id, type, { reminder7DaySentAt: new Date() });
    }

    // TIER 2: 3 Days Out (WARNING - In-App + Email)
    else if (daysRemaining === 3 && !enrollment.reminder3DaySentAt) {
      await sendTierNotification(user.id, 'Action Required', `Your assignment "${title}" is due in 3 days. Please resume your learning.`, 'WARNING', link);
      await sendReminderEmail(user, title, 3, false);
      await updateTracking(enrollment.id, type, { reminder3DaySentAt: new Date() });
    }

    // TIER 3: 1 Day Out (CRITICAL - In-App + Email + CC Supervisor)
    else if (daysRemaining === 1 && !enrollment.reminder1DaySentAt) {
      await sendTierNotification(user.id, 'Final Reminder', `Your assignment "${title}" is due tomorrow. Immediate completion is required.`, 'CRITICAL', link);
      
      // Fetch Supervisor for CC
      let supervisorEmail = null;
      if (user.immediateSuperiorId) {
        const superior = await prisma.user.findUnique({ where: { id: user.immediateSuperiorId } });
        supervisorEmail = superior?.email;
      }

      await sendReminderEmail(user, title, 1, true, supervisorEmail);
      await updateTracking(enrollment.id, type, { reminder1DaySentAt: new Date() });
    }
  } catch (error) {
    console.error(`Error processing reminders for user ${user.id} (${title}):`, error);
  }
}

async function sendTierNotification(userId: string, title: string, message: string, type: string, link: string) {
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
  const urgencyText = days === 1 ? 'is due TOMORROW' : `is due in ${days} days`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: ${color};">${isCritical ? 'URGENT: Final Reminder' : 'Upcoming Deadline'}</h2>
      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>This is a reminder that your assigned course <strong>"${title}"</strong> ${urgencyText}.</p>
      ${isCritical ? '<p style="font-weight: bold; color: #DC2626;">Immediate completion is required to maintain compliance.</p>' : '<p>Please ensure you complete the assignment by the target date.</p>'}
      <div style="margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Resume Learning</a>
      </div>
      ${ccEmail ? `<p style="font-size: 12px; color: #666; margin-top: 30px;">Notice: A copy of this final reminder has been sent to your supervisor.</p>` : ''}
    </div>
  `;

  const recipients = [user.email];
  if (ccEmail) recipients.push(ccEmail);

  for (const to of recipients) {
    if (!to) continue;
    await sendEmail({
      to,
      subject: `${isCritical ? 'URGENT: ' : ''}Reminder: "${title}" is due soon`,
      html
    }).catch(e => console.error(`Failed to send reminder email to ${to}:`, e));
  }
}
