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
    where: { title: 'iLearn Data Privacy Compliance' },
    include: { modules: { orderBy: { sequenceOrder: 'asc' } } }
  });

  if (!employee || !course) {
    console.log('Employee or Course not found');
    return;
  }

  const module1 = course.modules[0];
  const module2 = course.modules[1];

  console.log(`Employee: ${employee.firstName} ${employee.lastName} (${employee.id})`);
  console.log(`Course: ${course.title} (${course.id})`);
  console.log(`Module 1: ${module1.title} (${module1.id})`);
  console.log(`Module 2: ${module2.title} (${module2.id})`);

  // Reset first
  await prisma.transcript.deleteMany({
    where: { userId: employee.id, courseId: course.id }
  });
  await prisma.activitySubmission.deleteMany({
    where: { userId: employee.id, module: { courseId: course.id } }
  });
  await prisma.moduleProgress.deleteMany({
    where: { enrollment: { userId: employee.id, courseId: course.id } }
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: employee.id, courseId: course.id } },
    update: { status: 'IN_PROGRESS', currentModuleOrder: 0, completedAt: null },
    create: { userId: employee.id, courseId: course.id, status: 'IN_PROGRESS', currentModuleOrder: 0 }
  });

  console.log('Reset complete. Now executing steps...');

  const { EnrollmentsService } = require('./dist/src/modules/enrollments/enrollments.service');
  const { WorkshopsService } = require('./dist/src/modules/modules/workshops.service');

  // Step 1: Complete Module 1
  await EnrollmentsService.completeModule(employee.id, module1.id);
  console.log('Module 1 completed!');

  // Step 2: Submit Module 2 Activity
  const submission = await WorkshopsService.submitWorkshop(employee.id, module2.id, {
    textResponse: 'Risk assessment document submission.'
  });
  console.log('Module 2 submitted! Submission ID:', submission.id);

  // Step 3: Complete Module 2
  await EnrollmentsService.completeModule(employee.id, module2.id);
  console.log('Module 2 completed!');

  // Check enrollment status
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: employee.id, courseId: course.id } }
  });
  console.log('New Enrollment Status:', enrollment.status);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
