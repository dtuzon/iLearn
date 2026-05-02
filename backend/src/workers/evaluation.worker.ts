import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';

export function initEvaluationWorker() {
  // Run every day at midnight (0 0 * * *)
  // For testing, you could use '*/1 * * * *' to run every minute
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Running 180-Day Behavioral Evaluation Worker...');
    
    try {
      const evaluationThreshold = new Date();
      evaluationThreshold.setDate(evaluationThreshold.getDate() - 180);
      
      // Look for enrollments completed 180 days ago or older that haven't been triggered
      const enrollments = await prisma.enrollment.findMany({
        where: {
          status: 'COMPLETED',
          evaluation180DayTriggered: false,
          completedAt: {
            lte: evaluationThreshold
          },
          course: {
            requires180DayEval: true
          }
        },
        include: {
          user: {
            include: {
              immediateSuperior: true
            }
          },
          course: true
        }
      });

      if (enrollments.length === 0) {
        console.log('ℹ️ [CRON] No eligible enrollments found for 180-day evaluation.');
        return;
      }

      console.log(`🔍 [CRON] Found ${enrollments.length} enrollments eligible for 180-day evaluation.`);

      for (const enrollment of enrollments) {
        try {
          const supervisor = enrollment.user.immediateSuperior;
          
          if (!supervisor) {
            console.warn(`⚠️ [CRON] No supervisor found for employee ${enrollment.user.id}. Skipping evaluation trigger.`);
            // Optionally we could notify an admin or flag this record
            continue;
          }

          // 1. Create a notification for the supervisor
          await prisma.notification.create({
            data: {
              userId: supervisor.id,
              title: 'Action Required: 180-Day Evaluation',
              message: `It has been 180 days since ${enrollment.user.firstName} ${enrollment.user.lastName} completed "${enrollment.course.title}". Please conduct the behavioral evaluation.`,
              type: 'ACTION_REQUIRED',
              link: `/supervisor/team-evaluations?employeeId=${enrollment.user.id}&courseId=${enrollment.courseId}`
            }
          });

          // 2. Send an email alert to the supervisor
          await sendEmail({
            to: supervisor.email || '',
            subject: 'Action Required: 180-Day Behavioral Evaluation',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Behavioral Evaluation Required</h2>
                <p>Hello <strong>${supervisor.firstName}</strong>,</p>
                <p>It has been 180 days since <strong>${enrollment.user.firstName} ${enrollment.user.lastName}</strong> completed the course: <br/> 
                   <em style="color: #333;">"${enrollment.course.title}"</em>
                </p>
                <p>As their supervisor, you are now required to conduct a <strong>180-Day Behavioral Evaluation</strong> to assess the long-term impact of this training on their performance.</p>
                <p>Please log in to the iLearn Portal and navigate to <strong>Team Evaluations</strong> to complete the required assessment.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777;">This is an automated notification from the iLearn Portal.</p>
              </div>
            `
          });

          // 3. Flag the enrollment so we don't process it again
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { evaluation180DayTriggered: true }
          });

          console.log(`✅ [CRON] Triggered 180-day eval for ${enrollment.user.firstName} (Course: ${enrollment.course.title})`);
        } catch (err) {
          console.error(`❌ [CRON] Error processing 180-day eval for enrollment ${enrollment.id}:`, err);
        }
      }
    } catch (error) {
      console.error('❌ [CRON] Critical error in 180-day evaluation worker:', error);
    }
  });
  
  console.log('🚀 [CRON] 180-Day Evaluation Worker scheduled (Daily at Midnight).');
}
