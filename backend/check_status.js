const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const enrollment = await prisma.enrollment.findFirst({
    where: { user: { firstName: 'Tim', lastName: 'Padua' } }
  });
  console.log('STATUS:', enrollment.status);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
