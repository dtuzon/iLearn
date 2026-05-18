const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- DATABASE AUDIT ---');
  const userCount = await prisma.user.count();
  const batchCount = await prisma.batch.count();
  const courseCount = await prisma.course.count();
  const enrollmentCount = await prisma.courseEnrollment.count();
  const lpEnrollmentCount = await prisma.learningPathEnrollment.count();
  
  console.log('Users count:', userCount);
  console.log('Batches count:', batchCount);
  console.log('Courses count:', courseCount);
  console.log('Course Enrollments count:', enrollmentCount);
  console.log('Learning Path Enrollments count:', lpEnrollmentCount);

  if (batchCount > 0) {
    const firstBatch = await prisma.batch.findFirst();
    console.log('\nFirst Batch Details:', firstBatch);
    const batchCourses = await prisma.batchCourseSchedule.count({
      where: { batchId: firstBatch.id }
    });
    console.log('Courses scheduled in first batch:', batchCourses);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
