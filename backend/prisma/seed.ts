import { PrismaClient, Role, EnrollmentStatus, CourseStatus, ModuleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting SMART STAKEHOLDER DEMO SEED...');

  // Step 1: Safe Initialization & Fetching
  console.log('🧹 Cleaning up existing dummy content (preserving users/departments/settings)...');
  
  // Delete in order of dependencies
  await prisma.announcement.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.learningPathEnrollment.deleteMany();
  await prisma.learningPathCourse.deleteMany();
  await prisma.learningPathCertificate.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.activitySubmission.deleteMany();
  await prisma.evaluationResponse.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.courseAttachment.deleteMany();
  await prisma.certificateTemplate.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.onlineEvaluationResult.deleteMany();
  await prisma.course.deleteMany();
  await prisma.learningPath.deleteMany();

  console.log('🔍 Fetching existing stakeholder users...');
  
  const creator = await prisma.user.findFirst({
    where: { 
      OR: [
        { firstName: 'Abi', lastName: 'Manuel' },
        { firstName: 'Daniel', lastName: 'Tuzon' }
      ],
      role: Role.COURSE_CREATOR 
    }
  }) || await prisma.user.findFirst({ where: { role: Role.COURSE_CREATOR } });

  const employee = await prisma.user.findFirst({
    where: { firstName: 'Tim', lastName: 'Padua', role: Role.EMPLOYEE }
  }) || await prisma.user.findFirst({ where: { role: Role.EMPLOYEE } });

  const supervisor = await prisma.user.findFirst({
    where: { firstName: 'Harold', lastName: 'Nipas', role: Role.SUPERVISOR }
  }) || await prisma.user.findFirst({ where: { role: Role.SUPERVISOR } });

  const learningManager = await prisma.user.findFirst({
    where: { 
      OR: [
        { firstName: 'Gerald', lastName: 'Galang' },
        { username: 'gerald' }
      ],
      role: Role.LEARNING_MANAGER 
    }
  }) || await prisma.user.findFirst({ where: { role: Role.LEARNING_MANAGER } });

  if (!creator || !employee || !supervisor || !learningManager) {
    console.error('❌ ERROR: Could not find required stakeholder users in the database.');
    console.log('Ensure users like Abi Manuel, Tim Padua, Harold Nipas, and Gerald Galang exist.');
    return;
  }

  console.log(`✅ Linked Course Creator: ${creator.firstName} ${creator.lastName} (ID: ${creator.id})`);
  console.log(`✅ Linked Employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);
  console.log(`✅ Linked Supervisor: ${supervisor.firstName} ${supervisor.lastName} (ID: ${supervisor.id})`);
  console.log(`✅ Linked Learning Manager: ${learningManager.firstName} ${learningManager.lastName} (ID: ${learningManager.id})`);

  // Step 2: Seed Departments (Upsert)
  console.log('🏢 Syncing Corporate Departments...');
  const infraDept = await prisma.department.upsert({
    where: { name: 'Infra and Cyber' },
    update: {},
    create: { name: 'Infra and Cyber' }
  });


  await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' }
  });

  await prisma.department.upsert({
    where: { name: 'Sales & Marketing' },
    update: {},
    create: { name: 'Sales & Marketing' }
  });
  console.log('✅ Departments synchronized.');

  // Step 3: Seed Premium Content
  console.log('📚 Building Premium Course Catalog...');

  const course1 = await prisma.course.create({
    data: {
      title: 'Elevate Data Privacy Compliance',
      description: 'Comprehensive training on Data Privacy Act of 2012 (RA 10173) specifically tailored for insurance practitioners at Standard Insurance.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800',
      status: CourseStatus.PUBLISHED,
      lecturerId: creator.id,
      hasCertificate: true,
      modules: {
        create: [
          {
            title: 'Module 1: Privacy Fundamentals',
            type: ModuleType.VIDEO,
            sequenceOrder: 1,
            contentUrlOrText: 'https://example.com/videos/privacy-intro.mp4'
          },
          {
            title: 'Module 2: Practical Data Handling',
            type: ModuleType.WORKSHOP,
            sequenceOrder: 2,
            activityInstructions: 'Download the data handling template and submit your risk assessment for SI-wide operations.'
          }
        ]
      }
    }
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Advanced K.A.S.H. Principles',
      description: 'Mastering Knowledge, Attitude, Skills, and Habits to achieve peak performance in the corporate landscape.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800',
      status: CourseStatus.PUBLISHED,
      lecturerId: creator.id,
      modules: {
        create: [
          {
            title: 'Pre-Quiz: Baseline Assessment',
            type: ModuleType.PRE_QUIZ,
            sequenceOrder: 1,
            quizQuestions: {
              create: [
                {
                  questionText: 'What does the K in K.A.S.H. stand for?',
                  options: {
                    create: [
                      { optionText: 'Knowledge', isCorrect: true },
                      { optionText: 'Kindness', isCorrect: false },
                      { optionText: 'Key Performance', isCorrect: false }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: 'K.A.S.H. Interactive Workshop',
            type: ModuleType.VIDEO,
            sequenceOrder: 2,
            contentUrlOrText: 'https://example.com/videos/kash-core.mp4'
          }
        ]
      }
    }
  });

  const course3 = await prisma.course.create({
    data: {
      title: 'Cybersecurity Threat Mitigation',
      description: 'Protecting Standard Insurance assets against modern phishing, social engineering, and ransomware attacks.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800',
      status: CourseStatus.PUBLISHED,
      lecturerId: creator.id,
      modules: {
        create: [
          {
            title: 'Live Session: Defending the SI Perimeter',
            type: ModuleType.LIVE_SESSION,
            sequenceOrder: 1,
            meetingUrl: 'https://teams.microsoft.com/l/meetup-join/example',
            scheduledAt: new Date(Date.now() + 86400000 * 2), // 2 days from now
            attendanceCode: 'ELEVATE2024'
          }
        ]
      }
    }
  });

  console.log('🛣️  Building Corporate Onboarding Learning Path...');
  await prisma.learningPath.create({
    data: {
      title: 'Standard Insurance Core Onboarding',
      description: 'The definitive gateway for all new members of the Standard Insurance family.',
      isPublished: true,
      hasCertificate: true,
      pathCourses: {
        create: [
          { courseId: course1.id, order: 1 },
          { courseId: course2.id, order: 2 }
        ]
      }
    }
  });

  // Step 4: Seed Enrollments & Analytics
  console.log('📈 Simulating Realistic Enrollment Data for Analytics Dashboard...');

  // 1. COMPLETED Course (with Certificate/Transcript)
  const completedEnrollment = await prisma.enrollment.create({
    data: {
      userId: employee.id,
      courseId: course1.id,
      status: EnrollmentStatus.COMPLETED,
      completedAt: new Date(Date.now() - 86400000 * 7), // 1 week ago
      currentModuleOrder: 2
    }
  });

  await prisma.transcript.create({
    data: {
      userId: employee.id,
      courseId: course1.id,
      finalScore: 92,
      completionDate: new Date(Date.now() - 86400000 * 7)
    }
  });
  console.log(`   - Attached COMPLETED course to ${employee.firstName}`);

  // 2. IN_PROGRESS Course
  await prisma.enrollment.create({
    data: {
      userId: employee.id,
      courseId: course2.id,
      status: EnrollmentStatus.IN_PROGRESS,
      currentModuleOrder: 1
    }
  });
  console.log(`   - Attached IN_PROGRESS course to ${employee.firstName}`);

  // 3. OVERDUE Course
  await prisma.enrollment.create({
    data: {
      userId: employee.id,
      courseId: course3.id,
      status: EnrollmentStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
      currentModuleOrder: 0
    }
  });
  console.log(`   - Attached OVERDUE course to ${employee.firstName}`);

  // Add extra dummy employees for Harold (Supervisor)
  console.log('👥 Creating additional team members for Harold Nipas...');
  const extraEmployees = [
    { username: 'emp_demo1', firstName: 'John', lastName: 'Doe' },
    { username: 'emp_demo2', firstName: 'Jane', lastName: 'Smith' }
  ];

  for (const empData of extraEmployees) {
    const newEmp = await prisma.user.upsert({
      where: { username: empData.username },
      update: { immediateSuperiorId: supervisor.id },
      create: {
        ...empData,
        email: `${empData.username}@standardinsurance.com.ph`,
        passwordHash: '$2b$12$L7I/mF/X8B8yvB.oQ/7/GeY1/t/u/r/u/r/u/r/u/r/u/r/u/r/u/r', // 'password123'
        role: Role.EMPLOYEE,
        immediateSuperiorId: supervisor.id,
        departmentId: infraDept.id
      }
    });

    // Give them some random enrollments
    await prisma.enrollment.create({
      data: {
        userId: newEmp.id,
        courseId: course1.id,
        status: Math.random() > 0.5 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
        currentModuleOrder: 1
      }
    });
  }

  console.log('📢 Publishing Bulletin Board Announcements...');
  await prisma.announcement.create({
    data: {
      title: 'Welcome to Elevate LMS!',
      content: 'Welcome to the future of professional development at Standard Insurance. Explore our new courses and track your achievements in real-time!',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800',
      authorId: learningManager.id,
      priority: 'HIGH'
    }
  });

  await prisma.announcement.create({
    data: {
      title: 'Cybersecurity Month',
      content: 'Stay vigilant! Complete your Threat Mitigation module by the end of the week to ensure our perimeter remains secure.',
      authorId: creator.id,
      priority: 'NORMAL'
    }
  });

  console.log('\n✨ SMART SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Ready for the stakeholder demo. 🚀');
}

main()
  .catch((e) => {
    console.error('❌ SMART SEED FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
