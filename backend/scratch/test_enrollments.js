const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'EMPLOYEE' } });
  if (!users.length) return;
  const userId = users[0].id;

  const enrollments = await prisma.learningPathEnrollment.findMany({
    where: { userId },
    include: { learningPath: true }
  });
  console.log('Enrollments for', userId, ':', enrollments.length);
  if (enrollments.length > 0) {
    console.log(enrollments[0]);
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
