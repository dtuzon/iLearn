const { PrismaClient, EnrollmentStatus, ModuleType, CourseStatus } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- SEEDING PREMIUM COHORT BATCH & LIVE ANALYTICS ---');

  // 1. Find the learning path "Standard Insurance Core Onboarding"
  const lp = await prisma.learningPath.findFirst({
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

  if (!lp) {
    console.error('❌ Learning Path "Standard Insurance Core Onboarding" not found! Did you run npm run seed first?');
    return;
  }

  console.log(`Found Learning Path: ${lp.title} (ID: ${lp.id}) with ${lp.pathCourses.length} courses.`);

  // 2. Create the Premium Batch: "Standard Q2 Cohort"
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 15); // Started 15 days ago
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 15); // Ends in 15 days

  const batch = await prisma.batch.create({
    data: {
      name: 'Standard Q2 Cohort',
      startDate,
      endDate,
      status: 'ACTIVE',
      learningPathId: lp.id,
      requires180DayEval: true
    }
  });

  console.log(`✅ Created Batch: ${batch.name} (ID: ${batch.id})`);

  // 3. Create course schedules for the batch
  for (const pc of lp.pathCourses) {
    await prisma.batchCourseSchedule.create({
      data: {
        batchId: batch.id,
        courseId: pc.courseId,
        startDate,
        endDate,
        order: pc.order
      }
    });
    console.log(`   - Scheduled course: ${pc.course.title}`);
  }

  // 4. Find demo employees
  const employees = await prisma.user.findMany({
    where: {
      username: { in: ['tpadua', 'emp_demo1', 'emp_demo2'] }
    }
  });

  if (employees.length === 0) {
    console.error('❌ No demo employees found in database!');
    return;
  }

  console.log(`Found ${employees.length} demo employees to enroll.`);

  const empIds = employees.map(e => e.id);
  const courseIds = lp.pathCourses.map(pc => pc.courseId);

  console.log('🧹 Cleaning up existing enrollments and progress for demo employees to avoid constraint errors...');
  await prisma.moduleProgress.deleteMany({
    where: {
      enrollment: {
        userId: { in: empIds },
        courseId: { in: courseIds }
      }
    }
  });

  await prisma.activitySubmission.deleteMany({
    where: {
      userId: { in: empIds },
      module: { courseId: { in: courseIds } }
    }
  });

  await prisma.enrollment.deleteMany({
    where: {
      userId: { in: empIds },
      courseId: { in: courseIds }
    }
  });

  await prisma.learningPathEnrollment.deleteMany({
    where: {
      userId: { in: empIds },
      learningPathId: lp.id
    }
  });

  // 5. Enroll employees and seed realistic progress
  for (const emp of employees) {
    // A. Enroll in Learning Path for this batch
    const lpEnrollment = await prisma.learningPathEnrollment.create({
      data: {
        userId: emp.id,
        learningPathId: lp.id,
        batchId: batch.id,
        status: EnrollmentStatus.IN_PROGRESS,
        enrolledAt: startDate
      }
    });

    console.log(`Enrolled ${emp.firstName} ${emp.lastName} in Cohort Batch:`);

    // B. Enroll in each course in the learning path and seed grades
    for (const pc of lp.pathCourses) {
      const course = pc.course;
      
      const courseEnrollment = await prisma.enrollment.create({
        data: {
          userId: emp.id,
          courseId: course.id,
          batchId: batch.id,
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
          enrolledAt: startDate
        }
      });

      console.log(`  -> Course: ${course.title}`);

      // Seed modules progress
      for (const mod of course.modules) {
        if (mod.type === ModuleType.PRE_QUIZ) {
          // Tim: 70%, John: 50%, Jane: 80%
          let preScore = 70;
          if (emp.username === 'emp_demo1') preScore = 50;
          if (emp.username === 'emp_demo2') preScore = 80;

          await prisma.moduleProgress.create({
            data: {
              enrollmentId: courseEnrollment.id,
              moduleId: mod.id,
              score: preScore,
              completed: true,
              completedAt: new Date()
            }
          });
          console.log(`     * Pre-Quiz score: ${preScore}%`);

          // Create a mock POST-QUIZ progress as well to show knowledge delta
          // Since Advanced KASH Principles has a PRE-QUIZ, let's also give them post quiz scores
          // (Tim: 95%, John: 80%, Jane: 100%)
          let postScore = 95;
          if (emp.username === 'emp_demo1') postScore = 80;
          if (emp.username === 'emp_demo2') postScore = 100;

          // Let's create a temporary POST_QUIZ module or just mock score
          // (Wait, we can just save it or set postQuizAvg in frontend if we have progress records, but the backend getAnalytics filters by Module progress.
          // Since the course might not have a POST_QUIZ module seeded, let's create a POST_QUIZ module for this course in the DB to make it realistic!)
        }

        if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
          // Tim: 90%, John: 82%, Jane: 95%
          let actScore = 90;
          if (emp.username === 'emp_demo1') actScore = 82;
          if (emp.username === 'emp_demo2') actScore = 95;

          await prisma.activitySubmission.create({
            data: {
              moduleId: mod.id,
              userId: emp.id,
              batchId: batch.id,
              status: 'APPROVED',
              score: actScore,
              fileUrl: 'https://example.com/submissions/onboarding_assessment.pdf'
            }
          });
          console.log(`     * Workshop Submission: ${actScore}%`);
        }
      }
    }
  }

  // 6. Let's add a POST_QUIZ module to the "Advanced K.A.S.H. Principles" course so they have knowledge gain!
  const kashCourse = lp.pathCourses.find(pc => pc.course.title.includes('K.A.S.H.'))?.course;
  if (kashCourse) {
    const postQuizModule = await prisma.courseModule.create({
      data: {
        title: 'Post-Quiz: Final Evaluation',
        type: ModuleType.POST_QUIZ,
        sequenceOrder: 3,
        courseId: kashCourse.id
      }
    });

    console.log(`Created Post-Quiz Module for ${kashCourse.title}`);

    // Seed post quiz progress for the 3 employees
    for (const emp of employees) {
      const courseEnrollment = await prisma.enrollment.findFirst({
        where: { userId: emp.id, courseId: kashCourse.id }
      });

      if (courseEnrollment) {
        let postScore = 95;
        if (emp.username === 'emp_demo1') postScore = 80;
        if (emp.username === 'emp_demo2') postScore = 100;

        await prisma.moduleProgress.create({
          data: {
            enrollmentId: courseEnrollment.id,
            moduleId: postQuizModule.id,
            score: postScore,
            completed: true,
            completedAt: new Date()
          }
        });
        console.log(`   - Seeded Post-Quiz for ${emp.firstName}: ${postScore}%`);
      }
    }
  }

  console.log('\n🌟 PREMIUM COHORT BATCH & REALTIME ANALYTICS SEEDED SUCCESSFULLY!');
  console.log('You can now open the "Standard Q2 Cohort" batch in the Analytics dashboard and view complete live data!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
