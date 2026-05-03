import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { EnrollmentStatus } from '@prisma/client';
import { differenceInDays, startOfDay } from 'date-fns';

export function initEscalationWorker() {
  // Run every morning at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🔄 [CRON] Running Multi-Tiered Escalation Engine...');
    
    try {
      await processTieredReminders();
    } catch (error) {
      console.error('❌ [CRON] Critical error in escalation engine:', error);
    }
  });

  console.log('🚀 [CRON] Escalation Worker scheduled (Daily at 8:00 AM).');
}

async function processTieredReminders() {
  const today = startOfDay(new Date());

  // 1. Process Courses
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

  // 2. Process Learning Paths
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
    // Tier 1 (7 Days Out): In-App Bell Notification (INFO)
    if (daysRemaining === 7 && !enrollment.reminder7DaySentAt) {
      await notifyUser(user.id, 'Upcoming Deadline', `"${title}" is due in 7 days.`, 'INFO', link);
      await updateTracking(enrollment.id, type, { reminder7DaySentAt: new Date() });
    }

    // Tier 2 (3 Days Out): In-App Notification + Email (WARNING)
    else if (daysRemaining === 3 && !enrollment.reminder3DaySentAt) {
      await notifyUser(user.id, 'Action Required', `"${title}" is due in exactly 3 days. Please resume your learning.`, 'WARNING', link);
      await sendReminderEmail(user, title, 3, false);
      await updateTracking(enrollment.id, type, { reminder3DaySentAt: new Date() });
    }

    // Tier 3 (1 Day Out): In-App Notification + Email + CC Supervisor (CRITICAL)
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
    console.error(`Escalation failed for ${user.id} on ${title}:`, err);
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
  const urgencyText = days === 1 ? 'is due TOMORROW' : `is due in exactly ${days} days`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <h2 style="color: ${color}; margin-top: 0;">${isCritical ? '🚨 URGENT: Final Reminder' : '📅 Upcoming Deadline'}</h2>
      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>This is a scheduled reminder that your assigned ${isCritical ? 'mandatory ' : ''}content <strong>"${title}"</strong> ${urgencyText}.</p>
      ${isCritical ? '<p style="font-weight: bold; color: #DC2626;">Immediate completion is required to maintain your compliance status.</p>' : '<p>Please ensure you complete the assignment by the target date.</p>'}
      <div style="margin-top: 25px; margin-bottom: 25px;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Resume Learning</a>
      </div>
      <p style="font-size: 13px; color: #666;">If you have already completed this, please ignore this email. System synchronization may take a few minutes.</p>
      ${ccEmail ? `<p style="font-size: 11px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px;">Notice: A copy of this final escalation has been sent to your supervisor (${ccEmail}).</p>` : ''}
    </div>
  `;

  const recipients = [user.email];
  if (ccEmail) recipients.push(ccEmail);

  for (const to of recipients) {
    if (!to) continue;
    await sendEmail({
      to,
      subject: `${isCritical ? 'URGENT: ' : ''}Escalation Reminder: "${title}"`,
      html
    }).catch(e => console.error(`Failed to send email to ${to}:`, e));
  }
}
