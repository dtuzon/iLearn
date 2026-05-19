const { PrismaClient, EnrollmentStatus, ModuleType } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Real-world, deterministic sample grade profiles for a beautiful bell-curve distribution:
const gradeProfiles = [
  { pre: 75, post: 95, act: 98 },
  { pre: 60, post: 85, act: 90 },
  { pre: 80, post: 100, act: 95 },
  { pre: 50, post: 80, act: 85 },
  { pre: 70, post: 90, act: 92 },
  { pre: 65, post: 88, act: 89 },
  { pre: 85, post: 98, act: 97 },
  { pre: 55, post: 82, act: 88 },
  { pre: 90, post: 100, act: 100 },
  { pre: 72, post: 92, act: 94 },
  { pre: 68, post: 86, act: 90 },
  { pre: 78, post: 94, act: 96 },
  { pre: 62, post: 84, act: 87 },
  { pre: 82, post: 96, act: 98 },
  { pre: 58, post: 80, act: 84 },
  { pre: 74, post: 92, act: 93 },
  { pre: 66, post: 88, act: 91 }
];

async function main() {
  console.log('🌱 --- RESETTING & SEEDING COMPLETED BATCHES WITH REAL-WORLD METRICS ---');

  // 1. Fetch employees
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' }
  });

  if (employees.length === 0) {
    console.error('❌ No employees found in database! Please run default seeds first.');
    return;
  }
  console.log(`Found ${employees.length} employees to enroll.`);

  // 2. Fetch required templates/paths
  const lpOnboarding = await prisma.learningPath.findFirst({
    where: { title: 'Standard Insurance Core Onboarding' },
    include: {
      pathCourses: {
        include: {
          course: {
            include: {
              modules: true
            }
          }
        }
      }
    }
  });

  if (!lpOnboarding) {
    console.error('❌ Learning Path "Standard Insurance Core Onboarding" not found!');
    return;
  }

  const cyberCourse = await prisma.course.findFirst({
    where: { title: 'Cybersecurity Threat Mitigation' },
    include: { modules: true }
  });

  if (!cyberCourse) {
    console.error('❌ Course "Cybersecurity Threat Mitigation" not found!');
    return;
  }

  // Add POST_QUIZ module to Advanced K.A.S.H. Principles if it doesn't have one
  const kashCourse = lpOnboarding.pathCourses.find(pc => pc.course.title.includes('K.A.S.H.'))?.course;
  if (kashCourse && !kashCourse.modules.some(m => m.type === ModuleType.POST_QUIZ)) {
    console.log(`⚙️ Creating Post-Quiz Module for ${kashCourse.title}...`);
    const postQuizModule = await prisma.courseModule.create({
      data: {
        title: 'Post-Quiz: Final Evaluation',
        type: ModuleType.POST_QUIZ,
        sequenceOrder: 3,
        courseId: kashCourse.id
      }
    });
    kashCourse.modules.push(postQuizModule);
    console.log('✅ Post-Quiz Module created.');
  }

  // 3. Clean up ALL batches & schedules & enrollments first
  console.log('🧹 Purging all previous dummy batch records and progress...');

  const allTargetCourseIds = [
    ...lpOnboarding.pathCourses.map(pc => pc.courseId),
    cyberCourse.id
  ];
  const empIds = employees.map(e => e.id);

  await prisma.moduleProgress.deleteMany({
    where: { enrollment: { userId: { in: empIds }, courseId: { in: allTargetCourseIds } } }
  });

  await prisma.activitySubmission.deleteMany({
    where: { userId: { in: empIds }, module: { courseId: { in: allTargetCourseIds } } }
  });

  await prisma.enrollment.deleteMany({
    where: { userId: { in: empIds }, courseId: { in: allTargetCourseIds } }
  });

  await prisma.learningPathEnrollment.deleteMany({
    where: { userId: { in: empIds }, learningPathId: lpOnboarding.id }
  });

  await prisma.batchCourseSchedule.deleteMany();
  await prisma.batchChecker.deleteMany();
  await prisma.batch.deleteMany();

  console.log('✅ Purge complete.');

  // 4. Create first completed batch: "SI-2025-Q1 Core Executive Onboarding" (Learning Path)
  const q1Start = new Date('2025-01-05T00:00:00Z');
  const q1End = new Date('2025-02-05T00:00:00Z');

  const batch1 = await prisma.batch.create({
    data: {
      name: 'SI-2025-Q1 Core Executive Onboarding',
      startDate: q1Start,
      endDate: q1End,
      status: 'COMPLETED',
      learningPathId: lpOnboarding.id,
      requires180DayEval: true
    }
  });
  console.log(`✅ Created Batch: ${batch1.name} (ID: ${batch1.id})`);

  // Create schedules for Batch 1
  for (const pc of lpOnboarding.pathCourses) {
    await prisma.batchCourseSchedule.create({
      data: {
        batchId: batch1.id,
        courseId: pc.courseId,
        startDate: q1Start,
        endDate: q1End,
        order: pc.order
      }
    });
  }

  // 5. Create second completed batch: "SI-2025-Q2 Cybersecurity Awareness Cohort" (Single Course)
  const q2Start = new Date('2025-04-01T00:00:00Z');
  const q2End = new Date('2025-05-01T00:00:00Z');

  const batch2 = await prisma.batch.create({
    data: {
      name: 'SI-2025-Q2 Cybersecurity Awareness Cohort',
      startDate: q2Start,
      endDate: q2End,
      status: 'COMPLETED',
      courseId: cyberCourse.id,
      requires180DayEval: false
    }
  });
  console.log(`✅ Created Batch: ${batch2.name} (ID: ${batch2.id})`);

  await prisma.batchCourseSchedule.create({
    data: {
      batchId: batch2.id,
      courseId: cyberCourse.id,
      startDate: q2Start,
      endDate: q2End,
      order: 1
    }
  });

  // 6. Seed completed data for Batch 1 (Core Onboarding Learning Path)
  console.log(`⚙️ Seeding premium completed metrics for ${batch1.name}...`);
  for (let idx = 0; idx < employees.length; idx++) {
    const emp = employees[idx];
    const profile = gradeProfiles[idx % gradeProfiles.length];

    await prisma.learningPathEnrollment.create({
      data: {
        userId: emp.id,
        learningPathId: lpOnboarding.id,
        batchId: batch1.id,
        status: EnrollmentStatus.COMPLETED,
        enrolledAt: q1Start,
        completedAt: q1End
      }
    });

    for (const pc of lpOnboarding.pathCourses) {
      const course = pc.course;
      const courseEnrollment = await prisma.enrollment.create({
        data: {
          userId: emp.id,
          courseId: course.id,
          batchId: batch1.id,
          status: EnrollmentStatus.COMPLETED,
          enrolledAt: q1Start,
          completedAt: q1End
        }
      });

      for (const mod of course.modules) {
        if (mod.type === ModuleType.PRE_QUIZ) {
          await prisma.moduleProgress.create({
            data: {
              enrollmentId: courseEnrollment.id,
              moduleId: mod.id,
              score: profile.pre,
              completed: true,
              completedAt: q1Start
            }
          });
        }

        if (mod.type === ModuleType.POST_QUIZ) {
          await prisma.moduleProgress.create({
            data: {
              enrollmentId: courseEnrollment.id,
              moduleId: mod.id,
              score: profile.post,
              completed: true,
              completedAt: q1End
            }
          });
        }

        if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
          await prisma.activitySubmission.create({
            data: {
              moduleId: mod.id,
              userId: emp.id,
              batchId: batch1.id,
              status: 'APPROVED',
              score: profile.act,
              fileUrl: 'https://example.com/submissions/compliance_onboarding.pdf'
            }
          });
        }
      }
    }
  }

  // 7. Seed completed data for Batch 2 (Cybersecurity Single Course)
  console.log(`⚙️ Seeding premium completed metrics for ${batch2.name}...`);
  for (let idx = 0; idx < employees.length; idx++) {
    const emp = employees[idx];
    const profile = gradeProfiles[(idx + 3) % gradeProfiles.length]; // Offset profile slightly for variety

    const courseEnrollment = await prisma.enrollment.create({
      data: {
        userId: emp.id,
        courseId: cyberCourse.id,
        batchId: batch2.id,
        status: EnrollmentStatus.COMPLETED,
        enrolledAt: q2Start,
        completedAt: q2End
      }
    });

    for (const mod of cyberCourse.modules) {
      if (mod.type === ModuleType.PRE_QUIZ) {
        await prisma.moduleProgress.create({
          data: {
            enrollmentId: courseEnrollment.id,
            moduleId: mod.id,
            score: profile.pre - 5 > 0 ? profile.pre - 5 : 0, // customized offset
            completed: true,
            completedAt: q2Start
          }
        });
      }

      if (mod.type === ModuleType.POST_QUIZ) {
        await prisma.moduleProgress.create({
          data: {
            enrollmentId: courseEnrollment.id,
            moduleId: mod.id,
            score: profile.post,
            completed: true,
            completedAt: q2End
          }
        });
      }

      if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
        await prisma.activitySubmission.create({
          data: {
            moduleId: mod.id,
            userId: emp.id,
            batchId: batch2.id,
            status: 'APPROVED',
            score: profile.act,
            fileUrl: 'https://example.com/submissions/cyber_mitigation.pdf'
          }
        });
      }
    }
  }

  console.log('\n🌟 REAL-WORLD COMPLETED BATCHES SEEDED SUCCESSFULLY!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
