const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const employee = await prisma.user.findFirst({
    where: { firstName: 'Tim', lastName: 'Padua', role: 'EMPLOYEE' }
  });

  const course = await prisma.course.findFirst({
    where: { title: 'iLearn Data Privacy Compliance' }
  });

  if (!employee || !course) {
    console.log('Employee or Course not found');
    return;
  }

  // Find the pending activity submission
  const submission = await prisma.activitySubmission.findFirst({
    where: { userId: employee.id, module: { courseId: course.id }, status: 'PENDING' }
  });

  if (!submission) {
    console.log('No pending submission found');
    return;
  }

  console.log('Approving submission:', submission.id);

  const { WorkshopsService } = require('./dist/src/modules/modules/workshops.service');
  const admin = await prisma.user.findFirst({ where: { role: 'ADMINISTRATOR' } });
  
  await WorkshopsService.reviewSubmission(submission.id, admin.id, {
    status: 'APPROVED',
    feedback: 'Excellent work!'
  });

  console.log('Submission approved successfully!');

  // Check enrollment status
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: employee.id, courseId: course.id } }
  });
  console.log('Updated Enrollment Status:', enrollment.status);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
