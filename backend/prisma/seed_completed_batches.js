const { PrismaClient, EnrollmentStatus, ModuleType, CourseStatus } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- SEEDING COMPLETED BATCHES WITH DETAILED METRICS ---');

  // 1. Fetch all EMPLOYEE users
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' }
  });

  if (employees.length === 0) {
    console.error('❌ No employees found in database! Please seed users first.');
    return;
  }
  console.log(`Found ${employees.length} employees to enroll.`);

  // 2. Fetch the learning path "Standard Insurance Core Onboarding"
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
  console.log(`Found Learning Path: ${lpOnboarding.title} with ${lpOnboarding.pathCourses.length} courses.`);

  // 3. Find the course "Cybersecurity Threat Mitigation"
  const cyberCourse = await prisma.course.findFirst({
    where: { title: 'Cybersecurity Threat Mitigation' },
    include: { modules: true }
  });

  if (!cyberCourse) {
    console.error('❌ Course "Cybersecurity Threat Mitigation" not found!');
    return;
  }
  console.log(`Found Course: ${cyberCourse.title}`);

  // Add modules to Cybersecurity Threat Mitigation if it has only one or none
  if (cyberCourse.modules.length <= 1) {
    console.log('⚙️ Seeding standard modules for Cybersecurity Threat Mitigation...');
    
    // Clean up the initial live session to keep things aligned
    await prisma.courseModule.deleteMany({
      where: { courseId: cyberCourse.id }
    });

    const m1 = await prisma.courseModule.create({
      data: {
        title: 'Pre-Quiz: Cybersecurity Basics',
        type: ModuleType.PRE_QUIZ,
        sequenceOrder: 1,
        courseId: cyberCourse.id
      }
    });

    const m2 = await prisma.courseModule.create({
      data: {
        title: 'Social Engineering & Threat Vectors',
        type: ModuleType.VIDEO,
        sequenceOrder: 2,
        courseId: cyberCourse.id
      }
    });

    const m3 = await prisma.courseModule.create({
      data: {
        title: 'Phishing Defense Sandbox Activity',
        type: ModuleType.WORKSHOP,
        sequenceOrder: 3,
        courseId: cyberCourse.id
      }
    });

    const m4 = await prisma.courseModule.create({
      data: {
        title: 'Post-Quiz: Threat Response Assessment',
        type: ModuleType.POST_QUIZ,
        sequenceOrder: 4,
        courseId: cyberCourse.id
      }
    });

    // Refresh course modules in reference
    cyberCourse.modules = [m1, m2, m3, m4];
    console.log('✅ Seeding modules completed.');
  }

  // 4. Create first completed batch: "2025 Q1 Compliance Batch" (Learning Path)
  const q1Start = new Date('2025-01-05T00:00:00Z');
  const q1End = new Date('2025-02-05T00:00:00Z');

  const batch1 = await prisma.batch.create({
    data: {
      name: '2025 Q1 Compliance Batch',
      startDate: q1Start,
      endDate: q1End,
      status: 'COMPLETED',
      learningPathId: lpOnboarding.id,
      requires180DayEval: true
    }
  });
  console.log(`✅ Created Completed Batch: ${batch1.name} (ID: ${batch1.id})`);

  // Create course schedules for Batch 1
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

  // 5. Create second completed batch: "2025 Q2 Cybersecurity Cohort" (Single Course)
  const q2Start = new Date('2025-04-01T00:00:00Z');
  const q2End = new Date('2025-05-01T00:00:00Z');

  const batch2 = await prisma.batch.create({
    data: {
      name: '2025 Q2 Cybersecurity Cohort',
      startDate: q2Start,
      endDate: q2End,
      status: 'COMPLETED',
      courseId: cyberCourse.id,
      requires180DayEval: false
    }
  });
  console.log(`✅ Created Completed Batch: ${batch2.name} (ID: ${batch2.id})`);

  // Create course schedules for Batch 2
  await prisma.batchCourseSchedule.create({
    data: {
      batchId: batch2.id,
      courseId: cyberCourse.id,
      startDate: q2Start,
      endDate: q2End,
      order: 1
    }
  });

  // 6. Clean up any existing enrollments for all employees in these courses to avoid conflict
  const empIds = employees.map(e => e.id);
  const onboardingCourseIds = lpOnboarding.pathCourses.map(pc => pc.courseId);
  const allTargetCourseIds = [...onboardingCourseIds, cyberCourse.id];

  console.log('🧹 Cleaning up database constraint conflicts for all employees...');
  await prisma.moduleProgress.deleteMany({
    where: {
      enrollment: {
        userId: { in: empIds },
        courseId: { in: allTargetCourseIds }
      }
    }
  });

  await prisma.activitySubmission.deleteMany({
    where: {
      userId: { in: empIds },
      module: { courseId: { in: allTargetCourseIds } }
    }
  });

  await prisma.enrollment.deleteMany({
    where: {
      userId: { in: empIds },
      courseId: { in: allTargetCourseIds }
    }
  });

  await prisma.learningPathEnrollment.deleteMany({
    where: {
      userId: { in: empIds },
      learningPathId: lpOnboarding.id
    }
  });

  // 7. Seed completed data for Batch 1 (Compliance Batch)
  console.log(`⚙️ Seeding completed metrics for ${batch1.name}...`);
  for (const emp of employees) {
    // LP enrollment
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

    // Course enrollments
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

      // Modules progress
      for (const mod of course.modules) {
        if (mod.type === ModuleType.PRE_QUIZ) {
          const preScore = Math.floor(Math.random() * 30) + 50; // 50 to 80
          await prisma.moduleProgress.create({
            data: {
              enrollmentId: courseEnrollment.id,
              moduleId: mod.id,
              score: preScore,
              completed: true,
              completedAt: q1Start
            }
          });
        }

        if (mod.type === ModuleType.POST_QUIZ) {
          const postScore = Math.floor(Math.random() * 20) + 80; // 80 to 100
          await prisma.moduleProgress.create({
            data: {
              enrollmentId: courseEnrollment.id,
              moduleId: mod.id,
              score: postScore,
              completed: true,
              completedAt: q1End
            }
          });
        }

        if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
          const actScore = Math.floor(Math.random() * 15) + 85; // 85 to 100
          await prisma.activitySubmission.create({
            data: {
              moduleId: mod.id,
              userId: emp.id,
              batchId: batch1.id,
              status: 'APPROVED',
              score: actScore,
              fileUrl: 'https://example.com/submissions/compliance_onboarding.pdf'
            }
          });
        }
      }
    }
  }

  // 8. Seed completed data for Batch 2 (Cybersecurity Cohort)
  console.log(`⚙️ Seeding completed metrics for ${batch2.name}...`);
  for (const emp of employees) {
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

    // Modules progress
    for (const mod of cyberCourse.modules) {
      if (mod.type === ModuleType.PRE_QUIZ) {
        const preScore = Math.floor(Math.random() * 35) + 45; // 45 to 80
        await prisma.moduleProgress.create({
          data: {
            enrollmentId: courseEnrollment.id,
            moduleId: mod.id,
            score: preScore,
            completed: true,
            completedAt: q2Start
          }
        });
      }

      if (mod.type === ModuleType.POST_QUIZ) {
        const postScore = Math.floor(Math.random() * 20) + 80; // 80 to 100
        await prisma.moduleProgress.create({
          data: {
            enrollmentId: courseEnrollment.id,
            moduleId: mod.id,
            score: postScore,
            completed: true,
            completedAt: q2End
          }
        });
      }

      if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
        const actScore = Math.floor(Math.random() * 20) + 80; // 80 to 100
        await prisma.activitySubmission.create({
          data: {
            moduleId: mod.id,
            userId: emp.id,
            batchId: batch2.id,
            status: 'APPROVED',
            score: actScore,
            fileUrl: 'https://example.com/submissions/cyber_mitigation.pdf'
          }
        });
      }
    }
  }

  console.log('\n🌟 COMPLETED BATCHES SEEDED SUCCESSFULLY!');
  console.log('Both "2025 Q1 Compliance Batch" and "2025 Q2 Cybersecurity Cohort" are now fully populated and completed in the database.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
