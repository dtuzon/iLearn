const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Find the Q1 batch
  const batch = await prisma.batch.findFirst({
    where: { name: 'Q1. K.A.S.H. Onboarding' }
  });
  
  if (!batch) {
    console.log("Batch not found");
    return;
  }

  // Find a learning path
  const path = await prisma.learningPath.findFirst();
  if (!path) {
    console.log("No learning path found");
    return;
  }

  // Update batch with learningPathId
  await prisma.batch.update({
    where: { id: batch.id },
    data: { learningPathId: path.id }
  });

  console.log("Successfully linked learning path to batch:", batch.name);
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
