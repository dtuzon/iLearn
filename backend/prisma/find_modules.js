const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- FINDING COURSES WITH MODULES ---');
  const courses = await prisma.course.findMany({
    include: {
      modules: true
    }
  });

  const coursesWithModules = courses.filter(c => c.modules.length > 0);
  console.log(`Found ${coursesWithModules.length} courses with modules out of ${courses.length} courses total:`);
  coursesWithModules.forEach(c => {
    console.log(`- Course ID: ${c.id}, Title: ${c.title}, Status: ${c.status}, Modules: ${c.modules.length}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
