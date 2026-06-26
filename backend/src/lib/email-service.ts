import nodemailer from 'nodemailer';
import { prisma } from './prisma';


const getTransporter = async () => {
  if (process.env.MOCK_EMAIL === 'true') {
    return {
      sendMail: async (options: any) => {
        console.log(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
        return { messageId: 'mock-id' };
      },
      close: () => {}
    } as any;
  }

  const settings = await prisma.systemSettings.findFirst();
  
  // Use DB settings ONLY if they are actually configured (not example placeholders)
  const isDbConfigured = settings?.smtpServer && settings?.smtpServer !== 'smtp.example.com' && settings?.smtpUser;

  return nodemailer.createTransport({
    host: isDbConfigured ? settings.smtpServer : 'smtp.gmail.com',
    port: isDbConfigured ? settings.smtpPort : 465,
    secure: isDbConfigured ? (settings.smtpPort === 465) : true,
    auth: {
      user: isDbConfigured ? settings.smtpUser : process.env.SMTP_USER,
      pass: isDbConfigured ? settings.smtpPassword : process.env.SMTP_APP_PASSWORD,
    },
  } as any);
};



export const sendActivityUpdateEmail = async (
  userEmail: string, 
  status: 'APPROVED' | 'REJECTED', 
  courseName: string, 
  feedback?: string, 
  actionUrl?: string
) => {
  const isApproved = status === 'APPROVED';
  const title = isApproved ? 'Activity Approved!' : 'Action Required: Activity Changes Needed';
  const color = isApproved ? '#10b981' : '#ef4444';
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: ${color};">${title}</h2>
      <p>Hello,</p>
      <p>Your submission for the <strong>${courseName}</strong> workshop module has been reviewed.</p>
      
      ${isApproved ? 
        `<p>Great job! Your submission has been approved. You are now one step closer to earning your certificate.</p>` :
        `<p>Your submission requires some changes. Please review the feedback below and resubmit your activity.</p>
         <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
           <p style="margin: 0; font-weight: bold;">Checker Feedback:</p>
           <p style="margin: 5px 0 0 0;">${feedback}</p>
         </div>`
      }

      ${actionUrl ? `
        <div style="margin-top: 30px;">
          <a href="${actionUrl}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View in iLearn
          </a>
        </div>
      ` : ''}

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        This is an automated notification from the iLearn Learning Management System.
      </p>
    </div>
  `;

  try {
    const settings = await prisma.systemSettings.findFirst();
    const transporter = await getTransporter();
    const sender = (settings?.senderEmail && settings.senderEmail !== 'no-reply@example.com') 
      ? settings.senderEmail 
      : process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"iLearn LMS" <${sender}>`,
      to: userEmail,
      subject: `[iLearn] ${title} - ${courseName}`,
      html
    });
    console.log(`Email sent to ${userEmail} for ${courseName} (${status})`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};


export const sendActivitySubmissionEmail = async (
  checkerEmail: string,
  studentName: string,
  courseName: string,
  actionUrl?: string
) => {
  const title = 'Action Required: New Activity Submission';
  const color = '#f59e0b'; // Amber for attention
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: ${color};">${title}</h2>
      <p>Hello,</p>
      <p><strong>${studentName}</strong> has submitted an activity for the course <strong>${courseName}</strong> and it is awaiting your review.</p>
      
      <p>Please log in to the iLearn LMS to evaluate the submission and provide feedback.</p>

      ${actionUrl ? `
        <div style="margin-top: 30px;">
          <a href="${actionUrl}" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review Submission
          </a>
        </div>
      ` : ''}

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        This is an automated notification from the iLearn Learning Management System.
      </p>
    </div>
  `;

  try {
    const settings = await prisma.systemSettings.findFirst();
    const transporter = await getTransporter();
    const sender = (settings?.senderEmail && settings.senderEmail !== 'no-reply@example.com') 
      ? settings.senderEmail 
      : process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"iLearn LMS" <${sender}>`,
      to: checkerEmail,
      subject: `[iLearn] ${title} - ${studentName}`,
      html
    });
    console.log(`Notification email sent to checker ${checkerEmail} for ${studentName}'s submission`);
  } catch (error) {
    console.error('Failed to send checker notification email:', error);
  }
};

export const sendWelcomeEmail = async (
  userEmail: string,
  username: string,
  temporaryPassword: string,
  firstName: string
) => {
  const settings = await prisma.systemSettings.findFirst();
  const companyName = settings?.companyName || 'Standard Insurance Co., Inc.';
  const companyLogo = settings?.companyLogoUrl;
  const systemName = 'iLearn LMS';
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eef2f6; border-radius: 24px; color: #1f2937; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-height: 60px; margin-bottom: 20px;">` : `<h1 style="color: #4F46E5; margin: 0;">${companyName}</h1>`}
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0;">Welcome to ${systemName}!</h2>
        <p style="font-size: 16px; color: #6b7280; margin-top: 8px;">Your account has been successfully created.</p>
      </div>

      <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
        <p style="margin: 0 0 20px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; color: #64748b;">Your Login Credentials</p>
        
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Username</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #1e293b;">${username}</p>
        </div>

        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Email Address</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #1e293b;">${userEmail}</p>
        </div>

        <div>
          <p style="margin: 0; font-size: 14px; color: #64748b;">Temporary Password</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #4f46e5; font-family: monospace; background: #eff6ff; padding: 8px 12px; border-radius: 8px; display: inline-block;">${temporaryPassword}</p>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
          Log In to your Account
        </a>
      </div>

      <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
          <strong>Security Note:</strong> For your protection, you will be prompted to create a new, permanent password during your first login.
        </p>
      </div>

      <div style="border-top: 1px solid #eef2f6; padding-top: 30px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          This is an automated message from the <strong>${systemName}</strong> Portal.<br>
          If you didn't expect this email, please contact your HR administrator.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; font-weight: 700; color: #64748b;">${companyName}</p>
      </div>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const sender = (settings?.senderEmail && settings.senderEmail !== 'no-reply@example.com' && settings.senderEmail !== 'no-reply@standard-insurance.com') 
      ? settings.senderEmail 
      : process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"${systemName}" <${sender}>`,
      to: userEmail,
      subject: `Welcome to ${systemName} - Your Account is Ready`,
      html
    });
    console.log(`Welcome email sent successfully to ${userEmail}`);
  } catch (error) {
    console.error('CRITICAL: Failed to send Welcome Email:', error);
  }
};

export const sendTestEmail = async (
  userEmail: string,
  config?: {
    smtpServer?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    senderEmail?: string;
  }
) => {
  let transporter;

  if (process.env.MOCK_EMAIL === 'true') {
    transporter = {
      sendMail: async (options: any) => {
        console.log(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
        return { messageId: 'mock-id' };
      },
      close: () => {}
    } as any;
  } else if (config && config.smtpServer && config.smtpUser) {
    transporter = nodemailer.createTransport({
      host: config.smtpServer,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword || '',
      },
    } as any);
  } else {
    transporter = await getTransporter();
  }

  const settings = await prisma.systemSettings.findFirst();
  const sender = config?.senderEmail || 
    (settings?.senderEmail && settings.senderEmail !== 'no-reply@example.com' && settings.senderEmail !== 'no-reply@standard-insurance.com' ? settings.senderEmail : undefined) || 
    process.env.SMTP_USER || 
    'no-reply@company.com';

  await transporter.sendMail({
    from: `"iLearn LMS Test" <${sender}>`,
    to: userEmail,
    subject: `[iLearn] SMTP Test Connection`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4f46e5;">SMTP Connection Successful</h2>
        <p>Hello,</p>
        <p>This is a test email sent from the iLearn LMS to verify your SMTP server configuration.</p>
        <p>If you received this email, your SMTP settings are correct.</p>
        <p style="margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          This is an automated test notification from the iLearn Learning Management System.
        </p>
      </div>
    `
  });
};
