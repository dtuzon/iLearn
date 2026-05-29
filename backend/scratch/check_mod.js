const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const modId = 'cmpc8m28o000blsg68krbabdl';
  console.log('--- Checking Module Info ---');
  const mod = await prisma.courseModule.findUnique({
    where: { id: modId },
    include: { course: true }
  });
  console.log('Module:', mod);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
