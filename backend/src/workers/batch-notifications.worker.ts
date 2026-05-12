import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendBulkEmails } from '../lib/email';
import {
  batchEnrollmentEmployeeEmail,
  batchEnrollmentManagerEmail,
  batchReminderEmployeeEmail,
  batchReminderManagerEmail,
  batchScheduleUpdateEmployeeEmail,
  batchScheduleUpdateManagerEmail,
  batchCancellationEmployeeEmail,
  batchCancellationManagerEmail,
} from '../lib/email-templates';
import { differenceInDays, startOfDay } from 'date-fns';

export function initBatchNotificationWorker() {
  // Runs daily at 7:00 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('🔄 [CRON] Running Batch Pre-Training Notification Engine...');
    try {
      await processBatchReminders();
    } catch (error) {
      console.error('❌ [CRON] Critical error in batch notification worker:', error);
    }
  });

  console.log('🚀 [CRON] Batch Notification Worker scheduled (Daily at 7:00 AM).');
}

async function processBatchReminders() {
  const today = startOfDay(new Date());

  // Fetch all upcoming/active batches that haven't finished yet
  const batches = await prisma.batch.findMany({
    where: {
      startDate: { gt: today },
      status: { in: ['UPCOMING', 'ACTIVE'] }, // exclude CANCELLED
    },
    include: {
      course: { select: { title: true } },
      learningPath: { select: { title: true } },
      enrollments: {
        include: {
          user: {
            include: {
              department: true,
              immediateSuperior: true,
            },
          },
        },
      },
      learningPathEnrollments: {
        include: {
          user: {
            include: {
              department: true,
              immediateSuperior: true,
            },
          },
        },
      },
    },
  });

  for (const batch of batches) {
    const daysUntilStart = differenceInDays(startOfDay(new Date(batch.startDate)), today);
    const contentTitle = batch.course?.title ?? batch.learningPath?.title ?? batch.name;

    // Gather all enrolled users from both course and path enrollments
    const enrolledUsers = [
      ...batch.enrollments.map((e) => e.user),
      ...batch.learningPathEnrollments.map((e) => e.user),
    ];

    if (enrolledUsers.length === 0) continue;

    if (daysUntilStart === 30 && !batch.notify30DaySentAt) {
      console.log(`📧 [Batch] Sending 30-day notice for "${batch.name}" (${enrolledUsers.length} learners)`);
      await sendBatchNotifications(batch.id, enrolledUsers, contentTitle, batch.startDate, 30);
      await prisma.batch.update({ where: { id: batch.id }, data: { notify30DaySentAt: new Date() } });
    }

    if (daysUntilStart === 7 && !batch.notify7DaySentAt) {
      console.log(`📧 [Batch] Sending 7-day notice for "${batch.name}" (${enrolledUsers.length} learners)`);
      await sendBatchNotifications(batch.id, enrolledUsers, contentTitle, batch.startDate, 7);
      await prisma.batch.update({ where: { id: batch.id }, data: { notify7DaySentAt: new Date() } });
    }

    if (daysUntilStart === 3 && !batch.notify3DaySentAt) {
      console.log(`📧 [Batch] Sending 3-day notice for "${batch.name}" (${enrolledUsers.length} learners)`);
      await sendBatchNotifications(batch.id, enrolledUsers, contentTitle, batch.startDate, 3);
      await prisma.batch.update({ where: { id: batch.id }, data: { notify3DaySentAt: new Date() } });
    }
  }
}

// ─── Email Fan-Out ──────────────────────────────────────────────────────────

async function sendBatchNotifications(
  batchId: string,
  enrolledUsers: any[],
  contentTitle: string,
  startDate: Date,
  daysOut: number
) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const formattedDate = new Date(startDate).toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const emails: { to: string; subject: string; html: string }[] = [];
  const alreadyNotified = new Set<string>();
  const urgencyLabel = daysOut === 30 ? '1 Month Away' : daysOut === 7 ? '1 Week Away' : '3 Days Away';

  for (const user of enrolledUsers) {
    if (!user.email) continue;

    emails.push({
      to: user.email,
      subject: `[iLearn] Training Reminder (${urgencyLabel}): "${contentTitle}"`,
      html: batchReminderEmployeeEmail({ firstName: user.firstName, contentTitle, startDate: formattedDate, daysOut, frontendUrl }),
    });

    const supervisor = user.immediateSuperior;
    if (supervisor?.email && !alreadyNotified.has(supervisor.email)) {
      alreadyNotified.add(supervisor.email);
      emails.push({
        to: supervisor.email,
        subject: `[iLearn] Team Training Reminder (${urgencyLabel}): "${contentTitle}"`,
        html: batchReminderManagerEmail({ managerFirstName: supervisor.firstName, managerRole: 'Supervisor', employeeFirstName: user.firstName, employeeLastName: user.lastName, contentTitle, startDate: formattedDate, daysOut, frontendUrl }),
      });
    }

    if (user.department?.headUserId) {
      const deptHead = await prisma.user.findUnique({
        where: { id: user.department.headUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (deptHead?.email && !alreadyNotified.has(deptHead.email)) {
        alreadyNotified.add(deptHead.email);
        emails.push({
          to: deptHead.email,
          subject: `[iLearn] Department Training Reminder (${urgencyLabel}): "${contentTitle}"`,
          html: batchReminderManagerEmail({ managerFirstName: deptHead.firstName ?? '', managerRole: 'Department Head', employeeFirstName: user.firstName, employeeLastName: user.lastName, contentTitle, startDate: formattedDate, daysOut, frontendUrl }),
        });
      }
    }
  }

  await sendBulkEmails(emails);
}

// ─── Immediate Enrollment Confirmation (called directly, not by cron) ────────

export async function sendBatchEnrollmentConfirmation(
  batchName: string,
  contentTitle: string,
  startDate: Date,
  endDate: Date,
  users: any[]
) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const formattedStart = new Date(startDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedEnd   = new Date(endDate).toLocaleDateString('en-PH',   { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const emails: { to: string; subject: string; html: string }[] = [];
  const alreadyNotified = new Set<string>();

  for (const user of users) {
    if (!user.email) continue;

    emails.push({
      to: user.email,
      subject: `[iLearn] You've Been Enrolled: "${contentTitle}"`,
      html: batchEnrollmentEmployeeEmail({ firstName: user.firstName, batchName, contentTitle, startDate: formattedStart, endDate: formattedEnd, frontendUrl }),
    });

    const supervisor = user.immediateSuperior;
    if (supervisor?.email && !alreadyNotified.has(supervisor.email)) {
      alreadyNotified.add(supervisor.email);
      emails.push({
        to: supervisor.email,
        subject: `[iLearn] Team Member Enrolled: "${contentTitle}"`,
        html: batchEnrollmentManagerEmail({ managerFirstName: supervisor.firstName, managerRole: 'Supervisor', employeeFirstName: user.firstName, employeeLastName: user.lastName, batchName, contentTitle, startDate: formattedStart, endDate: formattedEnd, frontendUrl }),
      });
    }

    if (user.department?.headUserId) {
      const deptHead = await prisma.user.findUnique({
        where: { id: user.department.headUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (deptHead?.email && !alreadyNotified.has(deptHead.email)) {
        alreadyNotified.add(deptHead.email);
        emails.push({
          to: deptHead.email,
          subject: `[iLearn] Department Member Enrolled: "${contentTitle}"`,
          html: batchEnrollmentManagerEmail({ managerFirstName: deptHead.firstName ?? '', managerRole: 'Department Head', employeeFirstName: user.firstName, employeeLastName: user.lastName, batchName, contentTitle, startDate: formattedStart, endDate: formattedEnd, frontendUrl }),
        });
      }
    }
  }

  await sendBulkEmails(emails);
}

// ─── Immediate Schedule Update Notification (called directly, not by cron) ───

export async function sendBatchScheduleUpdateNotifications(
  batchName: string,
  contentTitle: string,
  users: any[]
) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const emails: { to: string; subject: string; html: string }[] = [];
  const alreadyNotified = new Set<string>();

  for (const user of users) {
    if (!user.email) continue;

    emails.push({
      to: user.email,
      subject: `[iLearn] Schedule Update: "${contentTitle}"`,
      html: batchScheduleUpdateEmployeeEmail({ firstName: user.firstName, batchName, contentTitle, frontendUrl }),
    });

    const supervisor = user.immediateSuperior;
    if (supervisor?.email && !alreadyNotified.has(supervisor.email)) {
      alreadyNotified.add(supervisor.email);
      emails.push({
        to: supervisor.email,
        subject: `[iLearn] Team Schedule Update: "${contentTitle}"`,
        html: batchScheduleUpdateManagerEmail({ managerFirstName: supervisor.firstName, managerRole: 'Supervisor', employeeFirstName: user.firstName, employeeLastName: user.lastName, batchName, contentTitle, frontendUrl }),
      });
    }

    if (user.department?.headUserId) {
      const deptHead = await prisma.user.findUnique({
        where: { id: user.department.headUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (deptHead?.email && !alreadyNotified.has(deptHead.email)) {
        alreadyNotified.add(deptHead.email);
        emails.push({
          to: deptHead.email,
          subject: `[iLearn] Department Schedule Update: "${contentTitle}"`,
          html: batchScheduleUpdateManagerEmail({ managerFirstName: deptHead.firstName ?? '', managerRole: 'Department Head', employeeFirstName: user.firstName, employeeLastName: user.lastName, batchName, contentTitle, frontendUrl }),
        });
      }
    }
  }

  await sendBulkEmails(emails);
}

// ─── Cancellation Notifications ───────────────────────────────────────────────

export async function sendBatchCancellationNotifications(
  batchName: string,
  contentTitle: string,
  enrolledUsers: any[],
  reason?: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const emails: { to: string; subject: string; html: string }[] = [];
  const alreadyNotified = new Set<string>();

  for (const user of enrolledUsers) {
    if (!user?.email) continue;
    alreadyNotified.add(user.email);

    // 1. Employee
    emails.push({
      to: user.email,
      subject: `[iLearn] Batch Cancelled: "${batchName}"`,
      html: batchCancellationEmployeeEmail({ firstName: user.firstName, batchName, contentTitle, reason, frontendUrl }),
    });

    // 2. Immediate Supervisor
    const supervisor = user.immediateSuperior;
    if (supervisor?.email && !alreadyNotified.has(supervisor.email)) {
      alreadyNotified.add(supervisor.email);
      emails.push({
        to: supervisor.email,
        subject: `[iLearn] Team Batch Cancelled: "${batchName}"`,
        html: batchCancellationManagerEmail({
          managerFirstName: supervisor.firstName,
          managerRole: 'Supervisor',
          employeeFirstName: user.firstName,
          employeeLastName: user.lastName,
          batchName,
          contentTitle,
          reason,
          frontendUrl,
        }),
      });
    }

    // 3. Department Head
    if (user.department?.headUserId) {
      const deptHead = await prisma.user.findUnique({
        where: { id: user.department.headUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (deptHead?.email && !alreadyNotified.has(deptHead.email)) {
        alreadyNotified.add(deptHead.email);
        emails.push({
          to: deptHead.email,
          subject: `[iLearn] Department Batch Cancelled: "${batchName}"`,
          html: batchCancellationManagerEmail({
            managerFirstName: deptHead.firstName ?? '',
            managerRole: 'Department Head',
            employeeFirstName: user.firstName,
            employeeLastName: user.lastName,
            batchName,
            contentTitle,
            reason,
            frontendUrl,
          }),
        });
      }
    }
  }

  if (emails.length > 0) {
    await sendBulkEmails(emails);
  }
}
