const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Checking Batches ---');
  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      courseSchedules: true,
      enrollments: {
        include: {
          user: { select: { username: true } }
        }
      }
    }
  });

  for (const b of batches) {
    console.log(`\nBatch: ${b.name} (${b.id})`);
    console.log(`Dates: ${b.startDate.toISOString()} to ${b.endDate.toISOString()}`);
    console.log('Course Schedules:');
    b.courseSchedules.forEach(s => {
      console.log(`  Course ID: ${s.courseId}`);
      console.log(`  Start Date: ${s.startDate ? s.startDate.toISOString() : 'null'}`);
      console.log(`  End Date: ${s.endDate ? s.endDate.toISOString() : 'null'}`);
      console.log(`  Order: ${s.order}`);
    });
    console.log('Enrollments:');
    b.enrollments.forEach(e => {
      console.log(`  Learner: ${e.user.username}`);
      console.log(`  Due Date: ${e.dueDate ? e.dueDate.toISOString() : 'null'}`);
      console.log(`  Status: ${e.status}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
