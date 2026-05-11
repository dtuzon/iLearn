/**
 * email-templates.ts
 * Centralised, branded HTML email templates for the Elevate LMS.
 * All templates share the same header/footer shell and colour system.
 */

const BRAND_NAME = 'Elevate LMS';
const COMPANY = 'Standard Insurance Co., Inc.';
const INDIGO = '#4F46E5';
const AMBER = '#D97706';
const RED = '#DC2626';
const GREEN = '#059669';

// ─── Shell ───────────────────────────────────────────────────────────────────

function shell(accentColor: string, headerTitle: string, headerSubtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND_NAME}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:32px 40px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">${BRAND_NAME} · ${COMPANY}</p>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.2;">${headerTitle}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${headerSubtitle}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
              This is an automated notification from the <strong>${BRAND_NAME}</strong> platform.<br>
              ${COMPANY} · Human Resources &amp; Learning Development
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared Partials ─────────────────────────────────────────────────────────

function trainingCard(fields: { label: string; value: string }[]): string {
  const rows = fields.map(f => `
    <tr>
      <td style="padding:8px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;white-space:nowrap;">${f.label}</td>
      <td style="padding:8px 16px;font-size:14px;font-weight:600;color:#1e293b;">${f.value}</td>
    </tr>`).join('');
  return `
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:24px 0;">
      ${rows}
    </table>`;
}

function ctaButton(label: string, url: string, color: string): string {
  return `
    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">${label}</a>
    </div>`;
}

function greeting(firstName: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#334155;">Hello <strong>${firstName}</strong>,</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">`;
}

// ─── Batch Enrollment Confirmation ───────────────────────────────────────────

export function batchEnrollmentEmployeeEmail(opts: {
  firstName: string;
  batchName: string;
  contentTitle: string;
  startDate: string;
  endDate: string;
  frontendUrl: string;
}): string {
  const body = `
    ${greeting(opts.firstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">You have been successfully enrolled in an upcoming training cohort on <strong>Elevate LMS</strong>.</p>
    ${trainingCard([
      { label: 'Batch',    value: opts.batchName },
      { label: 'Training', value: opts.contentTitle },
      { label: 'Starts',   value: opts.startDate },
      { label: 'Ends',     value: opts.endDate },
    ])}
    <p style="font-size:13px;color:#64748b;margin:0;">You will receive automatic reminders <strong>30 days</strong>, <strong>7 days</strong>, and <strong>3 days</strong> before the training begins.</p>
    ${ctaButton('View My Learning', `${opts.frontendUrl}/learning/my-courses`, INDIGO)}
  `;
  return shell(INDIGO, '🎓 You\'re Enrolled!', 'Training cohort assignment confirmed.', body);
}

export function batchEnrollmentManagerEmail(opts: {
  managerFirstName: string;
  managerRole: 'Supervisor' | 'Department Head';
  employeeFirstName: string;
  employeeLastName: string;
  batchName: string;
  contentTitle: string;
  startDate: string;
  endDate: string;
  frontendUrl: string;
}): string {
  const body = `
    ${greeting(opts.managerFirstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">A member of your team has been enrolled in an upcoming training cohort.</p>
    ${trainingCard([
      { label: 'Learner',  value: `${opts.employeeFirstName} ${opts.employeeLastName}` },
      { label: 'Batch',    value: opts.batchName },
      { label: 'Training', value: opts.contentTitle },
      { label: 'Starts',   value: opts.startDate },
      { label: 'Ends',     value: opts.endDate },
    ])}
    <p style="font-size:13px;color:#64748b;margin:0;">Please ensure your team member is available and prepared for the training period.</p>
    ${ctaButton('View Team Management', `${opts.frontendUrl}/supervisor/team-management`, INDIGO)}
  `;
  return shell(INDIGO, `👥 Team Enrollment Update`, `${opts.managerRole} notification — ${COMPANY}`, body);
}

// ─── Pre-Training Reminders ───────────────────────────────────────────────────

export function batchReminderEmployeeEmail(opts: {
  firstName: string;
  contentTitle: string;
  startDate: string;
  daysOut: number;
  frontendUrl: string;
}): string {
  const { daysOut } = opts;
  const color = daysOut === 3 ? RED : daysOut === 7 ? AMBER : INDIGO;
  const urgencyLabel = daysOut === 30 ? '1 Month Away' : daysOut === 7 ? '1 Week Away' : '3 Days Away — Final Reminder';
  const urgencyNote = daysOut <= 7
    ? `<p style="font-size:14px;font-weight:700;color:${color};margin:16px 0 0;">⚠️ Please ensure you are prepared and available on the training date.</p>`
    : '';
  const body = `
    ${greeting(opts.firstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">This is a scheduled reminder that your upcoming training starts in <strong>${daysOut} ${daysOut === 1 ? 'day' : 'days'}</strong>.</p>
    ${trainingCard([
      { label: 'Training', value: opts.contentTitle },
      { label: 'Starts',   value: opts.startDate },
    ])}
    ${urgencyNote}
    ${ctaButton('View My Learning', `${opts.frontendUrl}/learning/my-courses`, color)}
  `;
  return shell(color, `📅 Training Reminder — ${urgencyLabel}`, `${daysOut}-day advance notice`, body);
}

export function batchReminderManagerEmail(opts: {
  managerFirstName: string;
  managerRole: 'Supervisor' | 'Department Head';
  employeeFirstName: string;
  employeeLastName: string;
  contentTitle: string;
  startDate: string;
  daysOut: number;
  frontendUrl: string;
}): string {
  const { daysOut } = opts;
  const color = daysOut === 3 ? RED : daysOut === 7 ? AMBER : INDIGO;
  const urgencyLabel = daysOut === 30 ? '1 Month Away' : daysOut === 7 ? '1 Week Away' : '3 Days Away';
  const body = `
    ${greeting(opts.managerFirstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">This is an awareness notification for your team's upcoming training in <strong>${daysOut} ${daysOut === 1 ? 'day' : 'days'}</strong>.</p>
    ${trainingCard([
      { label: 'Learner',  value: `${opts.employeeFirstName} ${opts.employeeLastName}` },
      { label: 'Training', value: opts.contentTitle },
      { label: 'Starts',   value: opts.startDate },
    ])}
    ${ctaButton('View Team Management', `${opts.frontendUrl}/supervisor/team-management`, color)}
  `;
  return shell(color, `👥 Team Training — ${urgencyLabel}`, `${opts.managerRole} notification`, body);
}

// ─── Activity Grading ─────────────────────────────────────────────────────────

export function activityResultEmail(opts: {
  firstName: string;
  status: 'APPROVED' | 'REJECTED';
  courseName: string;
  feedback?: string;
  frontendUrl: string;
}): string {
  const approved = opts.status === 'APPROVED';
  const color = approved ? GREEN : RED;
  const title = approved ? 'Activity Approved! 🎉' : 'Action Required: Changes Needed';
  const message = approved
    ? `<p style="color:#065f46;font-size:15px;">Great work! Your submission has been <strong>approved</strong>. You are one step closer to earning your certificate.</p>`
    : `<p style="font-size:15px;color:#475569;">Your submission needs some revisions. Please review the feedback below and resubmit.</p>
       <div style="background:#fef2f2;border-left:4px solid ${RED};border-radius:8px;padding:16px 20px;margin:16px 0;">
         <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#b91c1c;">Checker Feedback</p>
         <p style="margin:0;font-size:14px;color:#7f1d1d;">${opts.feedback || 'No feedback provided.'}</p>
       </div>`;
  const body = `
    ${greeting(opts.firstName)}
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Your workshop submission for <strong>${opts.courseName}</strong> has been reviewed.</p>
    ${message}
    ${ctaButton('View in Elevate', `${opts.frontendUrl}/learning/my-courses`, color)}
  `;
  return shell(color, title, `Workshop submission update — ${opts.courseName}`, body);
}

export function activitySubmissionCheckerEmail(opts: {
  checkerFirstName: string;
  studentName: string;
  courseName: string;
  frontendUrl: string;
}): string {
  const body = `
    ${greeting(opts.checkerFirstName)}
    <p style="margin:0 0 16px;font-size:15px;color:#475569;"><strong>${opts.studentName}</strong> has submitted an activity for <strong>${opts.courseName}</strong> and is awaiting your review.</p>
    ${trainingCard([
      { label: 'Student', value: opts.studentName },
      { label: 'Course',  value: opts.courseName },
    ])}
    ${ctaButton('Review Submission', `${opts.frontendUrl}/grading`, AMBER)}
  `;
  return shell(AMBER, '📋 New Activity Submission', 'Action required — grading portal', body);
}

// ─── Batch Schedule Updates ───────────────────────────────────────────────────

export function batchScheduleUpdateEmployeeEmail(opts: {
  firstName: string;
  batchName: string;
  contentTitle: string;
  frontendUrl: string;
}): string {
  const body = `
    ${greeting(opts.firstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">The learning schedule for your upcoming training cohort has been updated by the Learning Manager.</p>
    ${trainingCard([
      { label: 'Batch',    value: opts.batchName },
      { label: 'Training', value: opts.contentTitle },
    ])}
    <p style="font-size:13px;color:#64748b;margin:0;">Please review the updated sequence and start dates in your dashboard to ensure you stay on track.</p>
    ${ctaButton('Review Schedule', `${opts.frontendUrl}/learning/my-courses`, INDIGO)}
  `;
  return shell(INDIGO, '🗓️ Schedule Updated', 'Important changes to your training timeline.', body);
}

export function batchScheduleUpdateManagerEmail(opts: {
  managerFirstName: string;
  managerRole: 'Supervisor' | 'Department Head';
  employeeFirstName: string;
  employeeLastName: string;
  batchName: string;
  contentTitle: string;
  frontendUrl: string;
}): string {
  const body = `
    ${greeting(opts.managerFirstName)}
    <p style="margin:0 0 4px;font-size:15px;color:#475569;">The learning schedule for a member of your team has been updated.</p>
    ${trainingCard([
      { label: 'Learner',  value: `${opts.employeeFirstName} ${opts.employeeLastName}` },
      { label: 'Batch',    value: opts.batchName },
      { label: 'Training', value: opts.contentTitle },
    ])}
    <p style="font-size:13px;color:#64748b;margin:0;">Please ensure your team member's availability aligns with these recent schedule adjustments.</p>
    ${ctaButton('View Team Management', `${opts.frontendUrl}/supervisor/team-management`, INDIGO)}
  `;
  return shell(INDIGO, `🗓️ Team Schedule Update`, `${opts.managerRole} notification — ${COMPANY}`, body);
}
