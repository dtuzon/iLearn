const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Checking BatchLiveSessions ---');
  const sessions = await prisma.batchLiveSession.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${sessions.length} Zoom meeting sessions.`);
  for (const s of sessions) {
    console.log(`- Session ID: ${s.id}, Batch ID: ${s.batchId}, Course Module ID: ${s.courseModuleId}, Zoom Meeting: ${s.zoomMeetingId}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
