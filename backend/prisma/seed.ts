import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting iLearn Baseline User Seeding...');

  // Step 1: Clean up existing content
  console.log('... Cleaning up existing data (courses, enrollments, modules, etc.)...');
  
  await prisma.announcement.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.learningPathEnrollment.deleteMany();
  await prisma.learningPathCourse.deleteMany();
  await prisma.learningPathCertificate.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.activitySubmission.deleteMany();
  await prisma.essaySubmission.deleteMany();
  await prisma.evaluationResponse.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.courseAttachment.deleteMany();
  await prisma.certificateTemplate.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.onlineEvaluationResult.deleteMany();
  await prisma.batchCourseSchedule.deleteMany();
  await prisma.batchChecker.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.course.deleteMany();
  await prisma.learningPath.deleteMany();

  // Step 2: Seed Corporate Departments
  console.log('🏢 Syncing Corporate Departments...');
  const infraDept = await prisma.department.upsert({
    where: { name: 'Infra and Cyber' },
    update: {},
    create: { name: 'Infra and Cyber' }
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' }
  });

  await prisma.department.upsert({
    where: { name: 'Sales & Marketing' },
    update: {},
    create: { name: 'Sales & Marketing' }
  });

  console.log('👥 Seeding baseline stakeholder users...');
  const defaultPasswordHash = '$2b$12$hHUoEsTWknGGEMYRrJQ4leauUvHcKCS0nXS9Lq1R1QskBreYL463S'; // 'password123'

  // Create Supervisor first so we can link Employee to them
  const supervisor = await prisma.user.upsert({
    where: { username: 'harold' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: 'harold',
      email: 'harold.nipas@standardinsurance.com.ph',
      passwordHash: defaultPasswordHash,
      firstName: 'Harold',
      lastName: 'Nipas',
      role: Role.SUPERVISOR,
      departmentId: infraDept.id
    }
  });

  await prisma.user.upsert({
    where: { username: 'tim' },
    update: { 
      passwordHash: defaultPasswordHash,
      immediateSuperiorId: supervisor.id 
    },
    create: {
      username: 'tim',
      email: 'tim.padua@standardinsurance.com.ph',
      passwordHash: defaultPasswordHash,
      firstName: 'Tim',
      lastName: 'Padua',
      role: Role.EMPLOYEE,
      departmentId: infraDept.id,
      immediateSuperiorId: supervisor.id
    }
  });

  await prisma.user.upsert({
    where: { username: 'abi' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: 'abi',
      email: 'abi.manuel@standardinsurance.com.ph',
      passwordHash: defaultPasswordHash,
      firstName: 'Abi',
      lastName: 'Manuel',
      role: Role.COURSE_CREATOR,
      departmentId: hrDept.id
    }
  });

  await prisma.user.upsert({
    where: { username: 'gerald' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: 'gerald',
      email: 'gerald.galang@standardinsurance.com.ph',
      passwordHash: defaultPasswordHash,
      firstName: 'Gerald',
      lastName: 'Galang',
      role: Role.LEARNING_MANAGER,
      departmentId: hrDept.id
    }
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: 'admin',
      email: 'admin@standardinsurance.com.ph',
      passwordHash: defaultPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMINISTRATOR
    }
  });

  // Step 3: Seed/Update System Settings Theme Color
  console.log('⚙️ Syncing System Settings Theme Color...');
  const currentSettings = await prisma.systemSettings.findFirst();
  if (currentSettings) {
    await prisma.systemSettings.update({
      where: { id: currentSettings.id },
      data: {
        primaryColorHex: '#e8aa33',
        companyName: 'Standard Insurance Co., Inc.'
      }
    });
  } else {
    await prisma.systemSettings.create({
      data: {
        companyName: 'Standard Insurance Co., Inc.',
        primaryColorHex: '#e8aa33',
        secondaryColorHex: '#10B981',
        frontPageWelcomeText: 'Welcome to the iLearn Portal',
        footerText: '© 2024 Standard Insurance Co., Inc. All Rights Reserved.',
        dashboardBulletinMessage: 'No active announcements.',
        smtpServer: 'smtp.gmail.com',
        smtpPort: 465,
        senderEmail: 'no-reply@standard-insurance.com',
        maxUploadSizeMb: 10,
        allowedFileTypes: '.pdf,.zip,.docx,.mp4'
      }
    });
  }

  console.log('\n✨ BASELINE SEEDING COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ BASELINE SEED FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
