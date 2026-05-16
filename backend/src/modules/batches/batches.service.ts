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
        learningPath: { select: { id: true, pathCourses: { include: { course: { include: { modules: true, passingGrade: true } } } } } },
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

    // 1. Enrollment Distribution
    const allEnrollments = [...batch.enrollments, ...batch.learningPathEnrollments];
    const totalLearners = allEnrollments.length;
    
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

    // 2. Average Score & Performance
    const allScores = [...batch.activitySubmissions, ...batch.essaySubmissions];
    let averageScore = 0;
    
    const learnerScores: Record<string, { name: string, totalScore: number, count: number }> = {};

    if (allScores.length > 0) {
      const totalScoreSum = allScores.reduce((acc, sub) => acc + (sub.score || 0), 0);
      averageScore = Math.round((totalScoreSum / allScores.length) * 10) / 10;

      allScores.forEach(sub => {
        if (!learnerScores[sub.userId]) {
          learnerScores[sub.userId] = { name: `${sub.user.firstName} ${sub.user.lastName}`, totalScore: 0, count: 0 };
        }
        learnerScores[sub.userId].totalScore += (sub.score || 0);
        learnerScores[sub.userId].count += 1;
      });
    }

    const topPerformers = Object.values(learnerScores)
      .map(ls => ({ name: ls.name, averageScore: Math.round((ls.totalScore / ls.count) * 10) / 10 }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    // 3. Knowledge Gain (Pre-Quiz vs Post-Quiz)
    let preQuizAvg = 0;
    let postQuizAvg = 0;
    let knowledgeIncreasePercentage = 0;

    const validUserIds = allEnrollments.map(e => e.userId);

    if (validUserIds.length > 0) {
      // Find all PRE_QUIZ and POST_QUIZ module progress for these users
      const quizProgress = await prisma.moduleProgress.findMany({
        where: {
          enrollment: { userId: { in: validUserIds } },
          module: { type: { in: ['PRE_QUIZ', 'POST_QUIZ'] } },
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

      if (preQuizAvg > 0) {
        knowledgeIncreasePercentage = Math.round(((postQuizAvg - preQuizAvg) / preQuizAvg) * 100);
      } else if (postQuizAvg > 0) {
        knowledgeIncreasePercentage = 100; // went from 0 to something
      }
    }

    // 3.5 Calculate Real KASH Metrics
    const skillsScore = allScores.length > 0 ? averageScore : 70; // Fallback to 70 if no activities
    const knowledgeScore = postQuizAvg > 0 ? postQuizAvg : (preQuizAvg > 0 ? preQuizAvg : 70);
    
    // Habits: Percentage of completed enrollments that were on time (before due date)
    const completedEnrollments = allEnrollments.filter(e => e.status === 'COMPLETED');
    let habitsScore = 75; // Default
    if (completedEnrollments.length > 0) {
      const onTime = (e: any) => !e.dueDate || !e.completedAt || new Date(e.completedAt) <= new Date(e.dueDate);
      const onTimeCount = completedEnrollments.filter(onTime).length;
      habitsScore = Math.round((onTimeCount / completedEnrollments.length) * 100);
    }

    // Attitude: Try to get from KASH evaluations if they exist
    let attitudeScore = 80; // Default
    
    // First find templates that are KASH evaluations
    const kashTemplates = await prisma.evaluationTemplate.findMany({
      where: { category: 'KASH_EVALUATION' },
      select: { id: true }
    });
    const kashTemplateIds = kashTemplates.map(t => t.id);

    const kashEvaluations = kashTemplateIds.length > 0 ? await prisma.evaluationResponse.findMany({
      where: { 
        userId: { in: validUserIds },
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
      let courses: any[] = [];
      
      if (batch.learningPathId) {
        // Find individual course enrollments for this user within this batch context
        const pathEnrollments = await prisma.enrollment.findMany({
          where: { userId: e.userId, batchId: batch.id },
          include: { course: { select: { id: true, title: true } } }
        });

        courses = await Promise.all(pathEnrollments.map(async pe => {
          const moduleProgress = await prisma.moduleProgress.findMany({
            where: { enrollmentId: pe.id, score: { not: null } },
            select: { score: true }
          });
          const avg = moduleProgress.length > 0 ? moduleProgress.reduce((a, b) => a + (b.score || 0), 0) / moduleProgress.length : 0;
          return {
            id: pe.courseId,
            title: pe.course.title,
            status: pe.status,
            averageScore: Math.round(avg * 10) / 10
          };
        }));
      } else {
        // Single course batch
        const moduleProgress = await prisma.moduleProgress.findMany({
          where: { enrollmentId: e.id, score: { not: null } },
          select: { score: true }
        });
        const avg = moduleProgress.length > 0 ? moduleProgress.reduce((a, b) => a + (b.score || 0), 0) / moduleProgress.length : 0;
        
        // Use batch.courseId as fallback if e.courseId isn't available on the type
        const courseId = (e as any).courseId || batch.courseId;
        
        courses = [{
          id: courseId,
          title: batch.course?.title || 'Unknown Course',
          status: e.status,
          averageScore: Math.round(avg * 10) / 10
        }];
      }

      return {
        id: e.userId,
        name: `${e.user.firstName} ${e.user.lastName}`,
        department: e.user.department?.name || 'N/A',
        role: e.user.role,
        status: e.status,
        enrolledAt: e.enrolledAt,
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

    const courseDetails = await Promise.all(coursesToAnalyze.map(async c => {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: c.id, batchId: batch.id, userId: { in: validUserIds } },
        include: { user: { select: { firstName: true, lastName: true, department: { select: { name: true } } } } }
      });

      const enrolledStudents = await Promise.all(enrollments.map(async enr => {
        // Quiz scores from module progress (PRE_QUIZ, POST_QUIZ)
        const quizProgress = await prisma.moduleProgress.findMany({
          where: { 
            enrollmentId: enr.id, 
            score: { not: null },
            module: { type: { in: ['PRE_QUIZ', 'POST_QUIZ'] } }
          },
          select: { score: true }
        });
        const qScore = quizProgress.length > 0 ? quizProgress.reduce((a, b) => a + (b.score || 0), 0) / quizProgress.length : 0;

        // Activity scores from ActivitySubmissions and EssaySubmissions
        const activityScores = await prisma.activitySubmission.findMany({
          where: { userId: enr.userId, batchId: batch.id, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        const essayScores = await prisma.essaySubmission.findMany({
          where: { userId: enr.userId, batchId: batch.id, score: { not: null }, status: 'APPROVED' },
          select: { score: true }
        });
        
        const allActScores = [...activityScores.map(s => s.score || 0), ...essayScores.map(s => s.score || 0)];
        const aScore = allActScores.length > 0 ? allActScores.reduce((a, b) => a + b, 0) / allActScores.length : 0;

        const overallScore = ((qScore + aScore) / (qScore > 0 && aScore > 0 ? 2 : 1));
        
        let result = 'Incomplete';
        if (enr.status === 'COMPLETED') {
          result = overallScore >= (c.passingGrade || 80) ? 'Passed' : 'Failed';
        }

        return {
          id: enr.userId,
          name: `${enr.user.firstName} ${enr.user.lastName}`,
          department: enr.user.department?.name || 'N/A',
          status: enr.status,
          quizScore: Math.round(qScore * 10) / 10,
          activityScore: Math.round(aScore * 10) / 10,
          score: Math.round(overallScore * 10) / 10,
          result,
          completedAt: enr.completedAt
        };
      }));

      const completions = enrollments.filter(enr => enr.status === 'COMPLETED').length;
      const compRate = enrollments.length > 0 ? Math.round((completions / enrollments.length) * 100) : 0;
      
      const totalQuiz = enrolledStudents.reduce((acc, s) => acc + s.quizScore, 0);
      const totalActivity = enrolledStudents.reduce((acc, s) => acc + s.activityScore, 0);
      const avgScore = enrolledStudents.length > 0 ? enrolledStudents.reduce((a, b) => a + b.score, 0) / enrolledStudents.length : 0;

      const passedCount = enrolledStudents.filter(s => s.result === 'Passed').length;
      const failedCount = enrolledStudents.filter(s => s.result === 'Failed').length;
      const incompleteCount = enrolledStudents.filter(s => s.result === 'Incomplete').length;

      return {
        id: c.id,
        title: c.title,
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
