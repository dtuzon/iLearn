const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.batch.findMany({
    include: {
      course: true,
      learningPath: true,
      _count: {
        select: {
          enrollments: true,
          learningPathEnrollments: true,
        }
      }
    }
  });
  console.log(JSON.stringify(batches, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
