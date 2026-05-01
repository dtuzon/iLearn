import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // e.g., hr@standard-insurance.com
    pass: process.env.SMTP_APP_PASSWORD, // Google App Password
  },
});

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
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
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
            View in Elevate
          </a>
        </div>
      ` : ''}

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        This is an automated notification from the Elevate Learning Management System.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Elevate LMS" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `[Elevate] ${title} - ${courseName}`,
      html
    });
    console.log(`Email sent to ${userEmail} for ${courseName} (${status})`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};
