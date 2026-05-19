const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 --- SEEDING ACTIVE LEARNERS ---');

  // Find a published course
  const course = await prisma.course.findFirst({
    where: { status: 'PUBLISHED' }
  });

  if (!course) {
    console.log('❌ No published course found. Run `npm run seed` first.');
    return;
  }

  // Find some employees
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    take: 8
  });

  if (employees.length === 0) {
    console.log('❌ No employees found.');
    return;
  }

  console.log(`Enrolling ${employees.length} employees into ${course.title}...`);

  for (const emp of employees) {
    // Ensure no duplicate enrollment
    const existing = await prisma.enrollment.findFirst({
      where: { userId: emp.id, courseId: course.id }
    });

    if (!existing) {
      await prisma.enrollment.create({
        data: {
          userId: emp.id,
          courseId: course.id,
          status: 'IN_PROGRESS',
          currentModuleOrder: 0
        }
      });
      console.log(`✅ Enrolled ${emp.firstName} ${emp.lastName}`);
    } else {
      await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'IN_PROGRESS' }
      });
      console.log(`✅ Re-activated ${emp.firstName} ${emp.lastName}`);
    }
  }

  console.log('🌟 ACTIVE LEARNERS SEEDED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
