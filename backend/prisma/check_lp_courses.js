const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- AUDITING LEARNING PATHS & COURSES ---');
  const lps = await prisma.learningPath.findMany({
    include: {
      pathCourses: {
        include: {
          course: true
        }
      }
    }
  });

  console.log(`Found ${lps.length} learning paths:`);
  lps.forEach(lp => {
    console.log(`- Path ID: ${lp.id}, Title: ${lp.title}`);
    console.log(`  Courses Count: ${lp.pathCourses.length}`);
    lp.pathCourses.forEach(pc => {
      console.log(`    * Course ID: ${pc.course.id}, Title: ${pc.course.title}, Order: ${pc.order}`);
    });
  });

  const courses = await prisma.course.findMany();
  console.log(`\nFound ${courses.length} courses in DB:`);
  courses.forEach(c => {
    console.log(`- Course ID: ${c.id}, Title: ${c.title}, Status: ${c.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
