"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("dotenv/config");
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
    }
    else {
        console.log('ℹ️  SystemSettings already exists — skipping.');
    }
    // ── Default Administrator Account ───────────────────────────────────────────
    const existingAdmin = await prisma.user.findUnique({
        where: { username: 'admin' },
    });
    if (!existingAdmin) {
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash('password123', saltRounds);
        await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@standardinsurance.com.ph',
                passwordHash,
                firstName: 'System',
                lastName: 'Administrator',
                role: client_1.Role.ADMINISTRATOR,
                isActive: true,
            },
        });
        console.log('✅ Default Administrator created.');
        console.log('   Username: admin');
        console.log('   Password: password123');
        console.log('   ⚠️  Change this password immediately after first login!');
    }
    else {
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
//# sourceMappingURL=seed.js.map