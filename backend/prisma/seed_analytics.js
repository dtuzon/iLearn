const { PrismaClient, EnrollmentStatus, ModuleType } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- SEEDING REALISTIC ANALYTICS FOR "Q1 test" ---');
  
  // 1. Find the Q1 test batch
  const batch = await prisma.batch.findFirst({
    where: { name: 'Q1 test' },
    include: {
      learningPath: {
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
      }
    }
  });

  if (!batch) {
    console.error('❌ Batch "Q1 test" not found. Please create it first in the UI.');
    return;
  }

  console.log(`Found Batch: ${batch.name} (ID: ${batch.id})`);
  const lp = batch.learningPath;
  if (!lp) {
    console.error('❌ Batch is not linked to a Learning Path.');
    return;
  }
  console.log(`Linked Learning Path: ${lp.title}`);

  // Get courses in the learning path
  const lpCourses = lp.pathCourses.map(pc => pc.course);
  console.log(`Found ${lpCourses.length} courses in learning path:`, lpCourses.map(c => c.title));

  // 2. Fetch or create Tim, John, Jane
  const employees = await prisma.user.findMany({
    where: {
      username: { in: ['tpadua', 'emp_demo1', 'emp_demo2'] }
    }
  });

  if (employees.length === 0) {
    console.error('❌ Required demo employees not found in DB.');
    return;
  }

  console.log(`Linking ${employees.length} employees to the batch...`);

  for (const emp of employees) {
    // A. Create Learning Path Enrollment for this batch
    const lpEnrollment = await prisma.learningPathEnrollment.upsert({
      where: {
        userId_learningPathId: {
          userId: emp.id,
          learningPathId: lp.id
        }
      },
      update: {
        batchId: batch.id,
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date()
      },
      create: {
        userId: emp.id,
        learningPathId: lp.id,
        batchId: batch.id,
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    console.log(`- Enrolled ${emp.firstName} ${emp.lastName} in LP: ${lp.title}`);

    // B. Enroll in each course in the learning path
    for (const course of lpCourses) {
      const courseEnrollment = await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: emp.id,
            courseId: course.id
          }
        },
        update: {
          batchId: batch.id,
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date()
        },
        create: {
          userId: emp.id,
          courseId: course.id,
          batchId: batch.id,
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date()
        }
      });

      console.log(`  -> Enrolled in course: ${course.title}`);

      // Seed quiz progress (Pre-Quiz & Post-Quiz) and activities for realistic analytics
      const modules = course.modules;
      
      for (const mod of modules) {
        if (mod.type === ModuleType.PRE_QUIZ) {
          // Pre-Quiz Score (tim: 65, demo1: 50, demo2: 75)
          let score = 65;
          if (emp.username === 'emp_demo1') score = 50;
          if (emp.username === 'emp_demo2') score = 75;

          await prisma.moduleProgress.upsert({
            where: {
              enrollmentId_moduleId: {
                enrollmentId: courseEnrollment.id,
                moduleId: mod.id
              }
            },
            update: { score, isCompleted: true, completedAt: new Date() },
            create: { enrollmentId: courseEnrollment.id, moduleId: mod.id, score, isCompleted: true, completedAt: new Date() }
          });
          console.log(`    * Pre-Quiz Score: ${score}%`);
        } 
        
        // Let's also simulate a Post-Quiz score
        // We will seed a module progress for the post-quiz if we want to show knowledge gain!
        // Tim: 90, demo1: 85, demo2: 95
        let postScore = 90;
        if (emp.username === 'emp_demo1') postScore = 85;
        if (emp.username === 'emp_demo2') postScore = 95;

        // Find if there is a Post-Quiz module
        if (mod.type === ModuleType.POST_QUIZ) {
          await prisma.moduleProgress.upsert({
            where: {
              enrollmentId_moduleId: {
                enrollmentId: courseEnrollment.id,
                moduleId: mod.id
              }
            },
            update: { score: postScore, isCompleted: true, completedAt: new Date() },
            create: { enrollmentId: courseEnrollment.id, moduleId: mod.id, score: postScore, isCompleted: true, completedAt: new Date() }
          });
          console.log(`    * Post-Quiz Score: ${postScore}%`);
        }

        // C. Seed Activity Submissions for WORKSHOP/ASSIGNMENT modules
        if (mod.type === ModuleType.WORKSHOP || mod.type === ModuleType.ASSIGNMENT) {
          let actScore = 88;
          if (emp.username === 'emp_demo1') actScore = 82;
          if (emp.username === 'emp_demo2') actScore = 96;

          await prisma.activitySubmission.create({
            data: {
              moduleId: mod.id,
              userId: emp.id,
              batchId: batch.id,
              status: 'APPROVED',
              score: actScore,
              fileUrl: 'https://example.com/submissions/compliance_risk.pdf',
              fileName: 'compliance_risk.pdf'
            }
          });
          console.log(`    * Activity Submission Score: ${actScore}%`);
        }
      }
    }
  }

  console.log('\n✅ "Q1 test" BATCH ANALYTICS SEED COMPLETED SUCCESSFULLY!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
