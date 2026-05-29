const { prisma } = require('../src/lib/prisma');

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'tpadua' }
  });
  console.log('User:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
