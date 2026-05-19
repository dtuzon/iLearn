import { prisma } from '../../lib/prisma';
import { sendBatchEnrollmentConfirmation, sendBatchScheduleUpdateNotifications, sendBatchCancellationNotifications } from '../../workers/batch-notifications.worker';

export class BatchesService {
  static async getAll() {
    return prisma.batch.findMany({
      include: {
        course: { select: { title: true } },
        learningPath: { select: { title: true } },
        _count: { select: { enrollments: true, learningPathEnrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getById(id: string) {
    return prisma.batch.findUnique({
      where: { id },
      include: {
        course: true,
        learningPath: {
          include: {
            pathCourses: {
              include: { course: true },
              orderBy: { order: 'asc' }
            }
          }
        },
        courseSchedules: {
          include: { course: true }
        },
        activityCheckers: {
          include: { user: true }
        },
        enrollments: {
          include: { user: { include: { department: true } } }
        },
        learningPathEnrollments: {
          include: { user: { include: { department: true } } }
        }
      }
    });
  }

  static async create(data: any) {
    return prisma.batch.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || 'UPCOMING',
        requires180DayEval: data.requires180DayEval ?? false,
        courseId: data.courseId,
        learningPathId: data.learningPathId,
        courseSchedules: {
          create: data.courseSchedules?.map((s: any) => ({
            courseId: s.courseId,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null
          }))
        },
        activityCheckers: {
          create: data.checkerIds?.map((userId: string) => ({
            userId
          }))
        }
      }
    });
  }

  static async update(id: string, data: any) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const batch = await tx.batch.update({
        where: { id },
        data: {
          name: data.name,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          status: data.status,
          requires180DayEval: data.requires180DayEval,
          courseId: data.courseId,
          learningPathId: data.learningPathId
        }
      });

      // 2. Sync Schedules
      if (data.courseSchedules) {
        await tx.batchCourseSchedule.deleteMany({ where: { batchId: id } });
        await tx.batchCourseSchedule.createMany({
          data: data.courseSchedules.map((s: any, idx: number) => ({
            batchId: id,
            courseId: s.courseId,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null,
            order: s.order ?? idx
          }))
        });
      }

      // 3. Sync Checkers
      if (data.checkerIds) {
        await tx.batchChecker.deleteMany({ where: { batchId: id } });
        await tx.batchChecker.createMany({
          data: data.checkerIds.map((userId: string) => ({
            batchId: id,
            userId
          }))
        });
      }

      return batch;
    });

    // 4. Trigger Email Notifications if requested
    if (data.notifyScheduleChanges) {
      // Fetch the updated batch with its enrollments
      const updatedBatch = await prisma.batch.findUnique({
        where: { id },
        include: {
          course: { select: { title: true } },
          learningPath: { select: { title: true } },
          enrollments: { include: { user: { include: { department: true, immediateSuperior: true } } } },
          learningPathEnrollments: { include: { user: { include: { department: true, immediateSuperior: true } } } }
        }
      });

      if (updatedBatch) {
        const contentTitle = updatedBatch.course?.title ?? updatedBatch.learningPath?.title ?? updatedBatch.name;
        const enrolledUsers = [
          ...updatedBatch.enrollments.map(e => e.user),
          ...updatedBatch.learningPathEnrollments.map(e => e.user)
        ];

        if (enrolledUsers.length > 0) {
          sendBatchScheduleUpdateNotifications(updatedBatch.name, contentTitle, enrolledUsers).catch(err => {
            console.error('Failed to send batch schedule update notifications:', err);
          });
        }
      }
    }

    return result;
  }

  static async assignLearners(batchId: string, userIds: string[]) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: { select: { title: true } },
        learningPath: { select: { title: true } },
      }
    });

    if (!batch) throw new Error('Batch not found');

    await prisma.$transaction(async (tx) => {
      // 1. Un-assign current learners from this batch
      await tx.enrollment.updateMany({
        where: { batchId },
        data: { batchId: null }
      });
      await tx.learningPathEnrollment.updateMany({
        where: { batchId },
        data: { batchId: null }
      });

      // 2. Re-assign the selected learners
      for (const userId of userIds) {
        if (batch.courseId) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId, courseId: batch.courseId } },
            update: { batchId, dueDate: batch.endDate },
            create: { userId, courseId: batch.courseId, batchId, dueDate: batch.endDate, status: 'NOT_STARTED' }
          });
        } else if (batch.learningPathId) {
          await tx.learningPathEnrollment.upsert({
            where: { userId_learningPathId: { userId, learningPathId: batch.learningPathId } },
            update: { batchId, dueDate: batch.endDate },
            create: { userId, learningPathId: batch.learningPathId, batchId, dueDate: batch.endDate, status: 'NOT_STARTED' }
          });
        }
      }
    });

    // 3. Fire enrollment confirmation emails (non-blocking)
    if (userIds.length > 0) {
      const contentTitle = batch.course?.title ?? batch.learningPath?.title ?? batch.name;
      const enrolledUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: {
          department: true,
          immediateSuperior: true,
        },
      });
      sendBatchEnrollmentConfirmation(
        batch.name,
        contentTitle,
        batch.startDate,
        batch.endDate,
        enrolledUsers
      ).catch((e) => console.error('[Batch] Failed to send enrollment confirmation emails:', e));
    }
  }

  static async getAnalytics(id: string, filters?: { departmentId?: string, role?: string, status?: string }) {
    const userFilter: any = {};
    if (filters?.departmentId && filters.departmentId !== 'all') userFilter.departmentId = filters.departmentId;
    if (filters?.role && filters.role !== 'all') userFilter.role = filters.role;

    const enrollmentFilter: any = {};
    if (Object.keys(userFilter).length > 0) enrollmentFilter.user = userFilter;
    if (filters?.status && filters.status !== 'all') enrollmentFilter.status = filters.status;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, modules: true, passingGrade: true } },
        learningPath: { select: { id: true, pathCourses: { include: { course: { include: { modules: true } } } } } },
        enrollments: { 
          where: enrollmentFilter,
          select: { id: true, status: true, userId: true, enrolledAt: true, user: { select: { firstName: true, lastName: true, role: true, department: { select: { name: true } } } } } 
        },
        learningPathEnrollments: { 
          where: enrollmentFilter,
          select: { id: true, status: true, userId: true, enrolledAt: true, user: { select: { firstName: true, lastName: true, role: true, department: { select: { name: true } } } } } 
        },
        activitySubmissions: {
          where: { status: 'APPROVED', score: { not: null }, user: Object.keys(userFilter).length > 0 ? userFilter : undefined },
          select: { score: true, userId: true, user: { select: { firstName: true, lastName: true } } }
        },
        essaySubmissions: {
          where: { status: 'APPROVED', score: { not: null }, user: Object.keys(userFilter).length > 0 ? userFilter : undefined },
          select: { score: true, userId: true, user: { select: { firstName: true, lastName: true } } }
        }
      }
    });

    if (!batch) throw new Error('Batch not found');

    // 1. Enrollment Distribution & Pre-requisites
    const rawEnrollments = [...batch.enrollments, ...batch.learningPathEnrollments];
    // Deduplicate by userId to get unique learners in this batch
    const uniqueEnrollmentsMap = new Map<string, typeof rawEnrollments[number]>();
    rawEnrollments.forEach(e => {
      if (!uniqueEnrollmentsMap.has(e.userId)) {
        uniqueEnrollmentsMap.set(e.userId, e);
      }
    });
    const allEnrollments = Array.from(uniqueEnrollmentsMap.values());
    const totalLearners = allEnrollments.length;
    const validUserIds = allEnrollments.map(e => e.userId);

    // Fetch all courses in this batch (either single course or learning path courses)
    let batchCourses: { id: string; title: string; passingGrade: number }[] = [];
    if (batch.courseId && batch.course) {
      batchCourses = [{
        id: batch.courseId,
        title: batch.course.title,
        passingGrade: batch.course.passingGrade || 80
      }];
    } else if (batch.learningPathId && batch.learningPath) {
      batchCourses = batch.learningPath.pathCourses.map((pc: any) => ({
        id: pc.course.id,
        title: pc.course.title,
        passingGrade: pc.course.passingGrade || 80
      }));
    }
    const batchCourseIds = batchCourses.map(c => c.id);

    const distribution = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      PENDING_GRADING: 0,
      COMPLETED: 0
    };

    allEnrollments.forEach(e => {
      if (distribution[e.status as keyof typeof distribution] !== undefined) {
        distribution[e.status as keyof typeof distribution]++;
      }
    });

    // 2. Average Score & Performance (Real-time database records)
    let averageScore = 0;
    const learnerScores: Record<string, { name: string, totalScore: number, count: number }> = {};
    let allScores: number[] = [];

    if (validUserIds.length > 0 && batchCourseIds.length > 0) {
      const activitySubmissions = await prisma.activitySubmission.findMany({
        where: {
          userId: { in: validUserIds },
          module: { courseId: { in: batchCourseIds } },
          status: 'APPROVED',
          score: { not: null }
        },
        select: { score: true, userId: true, user: { select: { firstName: true, lastName: true } } }
      });

      const essaySubmissions = await prisma.essaySubmission.findMany({
        where: {
          userId: { in: validUserIds },
          question: { module: { courseId: { in: batchCourseIds } } },
          status: 'APPROVED',
          score: { not: null }
        },
        select: { score: true, userId: true, user: { select: { firstName: true, lastName: true } } }
      });

      const combinedSubmissions = [...activitySubmissions, ...essaySubmissions];
      allScores = combinedSubmissions.map(s => s.score || 0);

      if (combinedSubmissions.length > 0) {
        const totalScoreSum = combinedSubmissions.reduce((acc, sub) => acc + (sub.score || 0), 0);
        averageScore = Math.round((totalScoreSum / combinedSubmissions.length) * 10) / 10;

        combinedSubmissions.forEach(sub => {
          if (!learnerScores[sub.userId]) {
            learnerScores[sub.userId] = { name: `${sub.user.firstName} ${sub.user.lastName}`, totalScore: 0, count: 0 };
          }
          learnerScores[sub.userId].totalScore += (sub.score || 0);
          learnerScores[sub.userId].count += 1;
        });
      }
    }

    const topPerformers = Object.values(learnerScores)
      .map(ls => ({ name: ls.name, averageScore: Math.round((ls.totalScore / ls.count) * 10) / 10 }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    // 3. Knowledge Gain (Pre-Quiz vs Post-Quiz)
    let preQuizAvg = 0;
    let postQuizAvg = 0;
    let knowledgeIncreasePercentage = 0;

    if (validUserIds.length > 0 && batchCourseIds.length > 0) {
      // Find all PRE_QUIZ and POST_QUIZ module progress for these users and courses
      const quizProgress = await prisma.moduleProgress.findMany({
        where: {
          enrollment: { userId: { in: validUserIds } },
          module: { 
            courseId: { in: batchCourseIds },
            type: { in: ['PRE_QUIZ', 'POST_QUIZ'] }
          },
          score: { not: null }
        },
        include: { module: { select: { type: true } } }
      });

      const preScores = quizProgress.filter(p => p.module.type === 'PRE_QUIZ').map(p => p.score || 0);
      const postScores = quizProgress.filter(p => p.module.type === 'POST_QUIZ').map(p => p.score || 0);

      if (preScores.length > 0) preQuizAvg = preScores.reduce((a, b) => a + b, 0) / preScores.length;
      if (postScores.length > 0) postQuizAvg = postScores.reduce((a, b) => a + b, 0) / postScores.length;
      
      preQuizAvg = Math.round(preQuizAvg * 10) / 10;
      postQuizAvg = Math.round(postQuizAvg * 10) / 10;

      if (postQuizAvg === 0) {
        knowledgeIncreasePercentage = 0; // Prevent misleading -100% when no post-quiz is taken
      } else if (preQuizAvg > 0) {
        knowledgeIncreasePercentage = Math.round(((postQuizAvg - preQuizAvg) / preQuizAvg) * 100);
      } else {
        knowledgeIncreasePercentage = 100; // went from 0 to something
      }
    }

    // 3.5 Calculate Real KASH Metrics
    const skillsScore = allScores.length > 0 ? averageScore : 70; // Fallback to 70 if no activities
    const knowledgeScore = postQuizAvg > 0 ? postQuizAvg : (preQuizAvg > 0 ? preQuizAvg : 70);
    
    // Habits: Percentage of completed enrollments that were on time (before due date)
    let habitsScore = 75; // Default
    if (validUserIds.length > 0 && batchCourseIds.length > 0) {
      const courseEnrollmentsForHabits = await prisma.enrollment.findMany({
        where: {
          userId: { in: validUserIds },
          courseId: { in: batchCourseIds }
        }
      });
      const completedCourseEnrollments = courseEnrollmentsForHabits.filter(e => e.status === 'COMPLETED');
      if (completedCourseEnrollments.length > 0) {
        const onTime = (e: any) => !e.dueDate || !e.completedAt || new Date(e.completedAt) <= new Date(e.dueDate);
        const onTimeCount = completedCourseEnrollments.filter(onTime).length;
        habitsScore = Math.round((onTimeCount / completedCourseEnrollments.length) * 100);
      }
    }

    // Attitude: Try to get from KASH evaluations if they exist
    let attitudeScore = 80; // Default
    
    // First find templates that are KASH evaluations
    const kashTemplates = await prisma.evaluationTemplate.findMany({
      where: { category: 'KASH_EVALUATION' },
      select: { id: true }
    });
    const kashTemplateIds = kashTemplates.map(t => t.id);

    const kashEvaluations = kashTemplateIds.length > 0 && validUserIds.length > 0 && batchCourseIds.length > 0 ? await prisma.evaluationResponse.findMany({
      where: { 
        userId: { in: validUserIds },
        courseId: { in: batchCourseIds },
        templateId: { in: kashTemplateIds }
      }
    }) : [];

    if (kashEvaluations.length > 0) {
      // Very basic average of all answers (assuming they are numeric ratings)
      let totalEvalScore = 0;
      let totalEvalCount = 0;
      kashEvaluations.forEach((rev: any) => {
        const answers = rev.answers as Record<string, number>;
        Object.values(answers).forEach(val => {
          if (typeof val === 'number') {
            totalEvalScore += (val / 5) * 100; // Normalize 1-5 to 0-100
            totalEvalCount++;
          }
        });
      });
      if (totalEvalCount > 0) attitudeScore = Math.round(totalEvalScore / totalEvalCount);
    }

    const kashMetrics = [
      { domain: 'Knowledge', score: knowledgeScore },
      { domain: 'Attitude', score: attitudeScore },
      { domain: 'Skills', score: skillsScore },
      { domain: 'Habits', score: habitsScore }
    ];

    // 4. Learner Breakdown Data
    const learnerDetails = await Promise.all(allEnrollments.map(async e => {
      const courses = await Promise.all(batchCourses.map(async bc => {
        const courseEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: e.userId,
              courseId: bc.id
            }
          }
        });

        if (!courseEnrollment) {
          return {
            id: bc.id,
            title: bc.title,
            preQuizScore: 0,
            postQuizScore: 0,
            activityScore: 0,
            status: 'Incomplete',
            averageScore: 0
          };
        }

        // Pre & Post Quiz scores
        const quizProgress = await prisma.moduleProgress.findMany({
          where: { 
            enrollmentId: courseEnrollment.id, 
            score: { not: null },
            module: { type: { in: ['PRE_QUIZ', 'POST_QUIZ'] } }
          },
          include: { module: { select: { type: true } } }
        });
        const preQuizScore = quizProgress.find(p => p.module.type === 'PRE_QUIZ')?.score || 0;
        const postQuizScore = quizProgress.find(p => p.module.type === 'POST_QUIZ')?.score || 0;

        // Activity scores from ActivitySubmissions and EssaySubmissions
        const activityScores = await prisma.activitySubmission.findMany({
          where: { userId: e.userId, batchId: batch.id, module: { courseId: bc.id }, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        const essayScores = await prisma.essaySubmission.findMany({
          where: { userId: e.userId, batchId: batch.id, question: { module: { courseId: bc.id } }, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        const allActScores = [...activityScores.map(s => s.score || 0), ...essayScores.map(s => s.score || 0)];
        const activityScore = allActScores.length > 0 ? allActScores.reduce((a, b) => a + b, 0) / allActScores.length : 0;

        const qScoreAvg = quizProgress.length > 0 ? quizProgress.reduce((a, b) => a + (b.score || 0), 0) / quizProgress.length : 0;
        const overallScore = ((qScoreAvg + activityScore) / (qScoreAvg > 0 && activityScore > 0 ? 2 : 1));

        let resultStatus = 'Incomplete';
        if (courseEnrollment.status === 'COMPLETED') {
          resultStatus = overallScore >= bc.passingGrade ? 'Passed' : 'Failed';
        }

        return {
          id: bc.id,
          title: bc.title,
          preQuizScore: Math.round(preQuizScore * 10) / 10,
          postQuizScore: Math.round(postQuizScore * 10) / 10,
          activityScore: Math.round(activityScore * 10) / 10,
          status: resultStatus,
          averageScore: Math.round(overallScore * 10) / 10
        };
      }));

      const preQuizAvg = courses.length > 0 ? courses.reduce((a, b) => a + b.preQuizScore, 0) / courses.length : 0;
      const postQuizAvg = courses.length > 0 ? courses.reduce((a, b) => a + b.postQuizScore, 0) / courses.length : 0;
      const activityScoreAvg = courses.length > 0 ? courses.reduce((a, b) => a + b.activityScore, 0) / courses.length : 0;

      let overallStatus = 'Incomplete';
      if (courses.length > 0) {
        const hasFailed = courses.some(c => c.status === 'Failed');
        const allPassed = courses.every(c => c.status === 'Passed');
        if (hasFailed) {
          overallStatus = 'Failed';
        } else if (allPassed) {
          overallStatus = 'Passed';
        } else {
          overallStatus = 'Incomplete';
        }
      }

      return {
        id: e.userId,
        name: `${e.user.firstName} ${e.user.lastName}`,
        department: e.user.department?.name || 'N/A',
        role: e.user.role,
        status: overallStatus,
        enrolledAt: e.enrolledAt,
        preQuizAvg: Math.round(preQuizAvg * 10) / 10,
        postQuizAvg: Math.round(postQuizAvg * 10) / 10,
        activityScoreAvg: Math.round(activityScoreAvg * 10) / 10,
        averageScore: learnerScores[e.userId] ? Math.round((learnerScores[e.userId].totalScore / learnerScores[e.userId].count) * 10) / 10 : 0,
        courses
      };
    }));

    // 5. Course Breakdown Data
    let coursesToAnalyze: any[] = [];
    if (batch.course) {
      coursesToAnalyze = [{ id: batch.courseId, title: batch.course.title, modules: batch.course.modules, passingGrade: batch.course.passingGrade }];
    }
    if (batch.learningPath) {
      coursesToAnalyze = batch.learningPath.pathCourses.map((pc: any) => ({
        id: pc.course.id,
        title: pc.course.title,
        modules: pc.course.modules,
        passingGrade: pc.course.passingGrade
      }));
    }

    const schedules = await prisma.batchCourseSchedule.findMany({
      where: { batchId: id }
    });

    const courseDetails = await Promise.all(coursesToAnalyze.map(async c => {
      const schedule = schedules.find(s => s.courseId === c.id);
      const cStartDate = schedule?.startDate || batch.startDate;
      const cEndDate = schedule?.endDate || batch.endDate;

      const enrolledStudents = await Promise.all(allEnrollments.map(async e => {
        const courseEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: e.userId,
              courseId: c.id
            }
          }
        });

        if (!courseEnrollment) {
          return {
            id: e.userId,
            name: `${e.user.firstName} ${e.user.lastName}`,
            department: e.user.department?.name || 'N/A',
            status: 'NOT_STARTED',
            quizScore: 0,
            activityScore: 0,
            score: 0,
            result: 'Incomplete',
            completedAt: null
          };
        }

        // Quiz scores from module progress (PRE_QUIZ, POST_QUIZ)
        const quizProgress = await prisma.moduleProgress.findMany({
          where: { 
            enrollmentId: courseEnrollment.id, 
            score: { not: null },
            module: { type: { in: ['PRE_QUIZ', 'POST_QUIZ'] } }
          },
          select: { score: true }
        });
        const qScore = quizProgress.length > 0 ? quizProgress.reduce((a, b) => a + (b.score || 0), 0) / quizProgress.length : 0;

        // Activity scores from ActivitySubmissions and EssaySubmissions
        const activityScores = await prisma.activitySubmission.findMany({
          where: { userId: e.userId, batchId: batch.id, module: { courseId: c.id }, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        const essayScores = await prisma.essaySubmission.findMany({
          where: { userId: e.userId, batchId: batch.id, question: { module: { courseId: c.id } }, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        
        const allActScores = [...activityScores.map(s => s.score || 0), ...essayScores.map(s => s.score || 0)];
        const aScore = allActScores.length > 0 ? allActScores.reduce((a, b) => a + b, 0) / allActScores.length : 0;

        const overallScore = ((qScore + aScore) / (qScore > 0 && aScore > 0 ? 2 : 1));
        
        let result = 'Incomplete';
        if (courseEnrollment.status === 'COMPLETED') {
          result = overallScore >= (c.passingGrade || 80) ? 'Passed' : 'Failed';
        }

        return {
          id: e.userId,
          name: `${e.user.firstName} ${e.user.lastName}`,
          department: e.user.department?.name || 'N/A',
          status: courseEnrollment.status,
          quizScore: Math.round(qScore * 10) / 10,
          activityScore: Math.round(aScore * 10) / 10,
          score: Math.round(overallScore * 10) / 10,
          result,
          completedAt: courseEnrollment.completedAt
        };
      }));

      const completions = enrolledStudents.filter(s => s.status === 'COMPLETED').length;
      const compRate = enrolledStudents.length > 0 ? Math.round((completions / enrolledStudents.length) * 100) : 0;
      
      const totalQuiz = enrolledStudents.reduce((acc, s) => acc + s.quizScore, 0);
      const totalActivity = enrolledStudents.reduce((acc, s) => acc + s.activityScore, 0);
      const avgScore = enrolledStudents.length > 0 ? enrolledStudents.reduce((a, b) => a + b.score, 0) / enrolledStudents.length : 0;

      const passedCount = enrolledStudents.filter(s => s.result === 'Passed').length;
      const failedCount = enrolledStudents.filter(s => s.result === 'Failed').length;
      const incompleteCount = enrolledStudents.filter(s => s.result === 'Incomplete').length;

      return {
        id: c.id,
        title: c.title,
        startDate: cStartDate,
        endDate: cEndDate,
        completionRate: compRate,
        avgQuizScore: enrolledStudents.length > 0 ? Math.round((totalQuiz / enrolledStudents.length) * 10) / 10 : 0,
        avgActivityScore: enrolledStudents.length > 0 ? Math.round((totalActivity / enrolledStudents.length) * 10) / 10 : 0,
        averageScore: Math.round(avgScore * 10) / 10,
        passedCount,
        failedCount,
        incompleteCount,
        enrolledStudents
      };
    }));

    return {
      name: batch.name,
      startDate: batch.startDate,
      endDate: batch.endDate,
      status: batch.status,
      totalLearners,
      completionRate: totalLearners > 0 ? Math.round((distribution.COMPLETED / totalLearners) * 100) : 0,
      distribution: [
        { name: 'Completed', value: distribution.COMPLETED, fill: '#10B981' },
        { name: 'In Progress', value: distribution.IN_PROGRESS, fill: '#3B82F6' },
        { name: 'Pending Grading', value: distribution.PENDING_GRADING, fill: '#F59E0B' },
        { name: 'Not Started', value: distribution.NOT_STARTED, fill: '#9CA3AF' }
      ],
      averageScore,
      topPerformers,
      kashMetrics,
      knowledgeDelta: {
        preQuizAvg,
        postQuizAvg,
        percentageIncrease: knowledgeIncreasePercentage
      },
      learnerDetails,
      courseDetails
    };
  }

  static async cancel(id: string, reason?: string) {
    // 1. Fetch batch with all enrolled users and their reporting chain
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        course: { select: { title: true } },
        learningPath: { select: { title: true } },
        enrollments: {
          include: { user: { include: { department: true, immediateSuperior: true } } }
        },
        learningPathEnrollments: {
          include: { user: { include: { department: true, immediateSuperior: true } } }
        }
      }
    });

    if (!batch) throw new Error('Batch not found');
    if (batch.status === 'CANCELLED') throw new Error('Batch is already cancelled');

    // 2. Mark the batch as CANCELLED
    await prisma.batch.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // 3. Detach enrollments from this batch (keep enrollments intact, just remove batch link)
    await prisma.$transaction([
      prisma.enrollment.updateMany({ where: { batchId: id }, data: { batchId: null } }),
      prisma.learningPathEnrollment.updateMany({ where: { batchId: id }, data: { batchId: null } }),
    ]);

    // 4. Fire cancellation notifications (non-blocking)
    const contentTitle = batch.course?.title ?? batch.learningPath?.title ?? batch.name;
    const enrolledUsers = [
      ...batch.enrollments.map(e => e.user),
      ...batch.learningPathEnrollments.map(e => e.user),
    ];

    if (enrolledUsers.length > 0) {
      sendBatchCancellationNotifications(batch.name, contentTitle, enrolledUsers, reason)
        .catch(err => console.error('[Batch] Failed to send cancellation notifications:', err));
    }

    return { message: 'Batch cancelled successfully', affectedLearners: enrolledUsers.length };
  }

  static async delete(id: string) {
    return prisma.batch.delete({ where: { id } });
  }
}
