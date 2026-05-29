const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const modId = 'cmpdnsmau0007ckg69mgd8k93';
  const batchId = 'cmpl6fc890000lwg60kimf0b4';

  console.log('--- Checking Module Info ---');
  const mod = await prisma.courseModule.findUnique({
    where: { id: modId },
    include: { course: true }
  });
  console.log('Module:', mod);

  console.log('\n--- Checking Batch Info ---');
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: {
        include: {
          modules: true
        }
      },
      learningPath: {
        include: {
          pathCourses: {
            include: {
              course: {
                include: {
                  modules: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (batch.course) {
    console.log(`Batch has Course: ${batch.course.title} (${batch.course.id})`);
    console.log('Course Modules:');
    batch.course.modules.forEach(m => {
      console.log(`  - Module: ${m.title} (${m.id}) [${m.type}]`);
    });
  } else if (batch.learningPath) {
    console.log(`Batch has Learning Path: ${batch.learningPath.title} (${batch.learningPath.id})`);
    console.log('Path Courses and Modules:');
    batch.learningPath.pathCourses.forEach(pc => {
      console.log(`  Course: ${pc.course.title} (${pc.course.id})`);
      pc.course.modules.forEach(m => {
        console.log(`    - Module: ${m.title} (${m.id}) [${m.type}]`);
      });
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
