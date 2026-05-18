const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- AUDITING Q1 TEST BATCH ---');
  const batch = await prisma.batch.findFirst({
    where: { name: 'Q1 test' },
    include: {
      enrollments: true,
      learningPathEnrollments: true
    }
  });

  if (!batch) {
    console.log('Batch "Q1 test" not found in database!');
    return;
  }

  console.log('Batch found:', {
    id: batch.id,
    name: batch.name,
    startDate: batch.startDate,
    endDate: batch.endDate,
    status: batch.status,
    courseId: batch.courseId,
    learningPathId: batch.learningPathId
  });

  console.log('Batch enrollments count:', batch.enrollments.length);
  console.log('Learning path enrollments count:', batch.learningPathEnrollments.length);

  // Check all enrollments in database to see if they are associated with any batch
  const allEnr = await prisma.enrollment.findMany({
    include: { user: true }
  });
  console.log('\nTotal Course Enrollments in entire DB:', allEnr.length);
  allEnr.forEach(e => {
    console.log(`- Enrollment ID: ${e.id}, User: ${e.user.firstName} ${e.user.lastName}, CourseID: ${e.courseId}, BatchID: ${e.batchId}`);
  });

  const allLPEnr = await prisma.learningPathEnrollment.findMany({
    include: { user: true }
  });
  console.log('\nTotal LP Enrollments in entire DB:', allLPEnr.length);
  allLPEnr.forEach(e => {
    console.log(`- LP Enrollment ID: ${e.id}, User: ${e.user.firstName} ${e.user.lastName}, LP ID: ${e.learningPathId}, BatchID: ${e.batchId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
