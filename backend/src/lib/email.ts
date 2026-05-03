import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SENDER_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP settings missing. Logging email to console:');
    console.log('-----------------------------------');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html.substring(0, 500)}...`);
    console.log('-----------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: SENDER_EMAIL || SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
  }
}

export async function sendBulkEmails(payloads: EmailOptions[]) {
  const BATCH_SIZE = 10;
  const DELAY_MS = 2000;

  if (payloads.length === 0) return;

  // Process in background - don't await this in the main thread
  (async () => {
    console.log(`[Email Throttler] Starting queue for ${payloads.length} emails...`);
    
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      console.log(`[Email Throttler] Sending batch of ${batch.length} (${i + 1}-${Math.min(i + BATCH_SIZE, payloads.length)} of ${payloads.length})`);
      
      await Promise.all(batch.map(payload => 
        sendEmail(payload).catch(err => {
          console.error(`[Email Throttler] Fatal error for ${payload.to}:`, err);
        })
      ));

      if (i + BATCH_SIZE < payloads.length) {
        console.log(`[Email Throttler] Waiting ${DELAY_MS}ms for next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
    
    console.log(`[Email Throttler] Queue completed successfully.`);
  })();
}
