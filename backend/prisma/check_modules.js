const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- AUDITING COURSE MODULES ---');
  const courses = await prisma.course.findMany({
    where: {
      id: { in: ['cmoqqp21a0005p0g6iyp1q58c', 'cmos9xu0l001o64g6rftcbroh'] }
    },
    include: {
      modules: true
    }
  });

  courses.forEach(c => {
    console.log(`\nCourse: ${c.title} (ID: ${c.id})`);
    console.log(`Modules Count: ${c.modules.length}`);
    c.modules.forEach(m => {
      console.log(`- Module ID: ${m.id}, Title: ${m.title}, Type: ${m.type}, Order: ${m.sequenceOrder}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
