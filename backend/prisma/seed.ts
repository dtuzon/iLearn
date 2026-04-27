import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // ── Default System Settings ──────────────────────────────────────────────────
  const existingSettings = await prisma.systemSettings.findFirst();
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        companyName: 'Standard Insurance Co., Inc.',
        primaryColorHex: '#4F46E5',
        secondaryColorHex: '#10B981',
        passingScore: 80,
      },
    });
    console.log('✅ Default SystemSettings created.');
  } else {
    console.log('ℹ️  SystemSettings already exists — skipping.');
  }

  // ── Default Administrator Account ───────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);

    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@standardinsurance.com.ph',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: Role.ADMINISTRATOR,
        isActive: true,
      },
    });
    console.log('✅ Default Administrator created.');
    console.log('   Username: admin');
    console.log('   Password: password123');
    console.log('   ⚠️  Change this password immediately after first login!');
  } else {
    console.log('ℹ️  Admin user already exists — skipping.');
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
