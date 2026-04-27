import { prisma } from '../../lib/prisma';
import { shuffle } from '../../utils/shuffle';
import { ModuleType } from '@prisma/client';

export class QuizzesService {
  static async addQuestions(moduleId: string, questions: any[]) {
    return prisma.$transaction(async (tx) => {
      for (const q of questions) {
        await tx.quizQuestion.create({
          data: {
            questionText: q.questionText,
            moduleId,
            options: {
              create: q.options.map((opt: any) => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect
              }))
            }
          }
        });
      }
    });
  }

  static async getQuizForEmployee(moduleId: string) {
    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId },
      include: {
        options: {
          select: {
            id: true,
            optionText: true
            // CRITICAL: strip isCorrect
          }
        }
      }
    });

    // Shuffle questions
    const shuffledQuestions = shuffle(questions).map((q) => ({
      ...q,
      // Shuffle options within each question
      options: shuffle(q.options)
    }));

    return shuffledQuestions;
  }

  static async submitQuiz(userId: string, moduleId: string, submissions: { questionId: string; optionId: string }[]) {
    // Fetch correct options for these questions
    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId },
      include: {
        options: {
          where: { isCorrect: true },
          select: { id: true, questionId: true }
        }
      }
    });

    let correctCount = 0;
    const totalQuestions = questions.length;

    for (const q of questions) {
      const correctOptionId = q.options[0]?.id;
      const userSubmission = submissions.find((s) => s.questionId === q.id);
      
      if (userSubmission && userSubmission.optionId === correctOptionId) {
        correctCount++;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Find enrollment
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: module.courseId
        }
      }
    });

    if (!enrollment) throw new Error('User not enrolled');

    // Check passing score for Post-Quiz
    let completed = true;
    if (module.type === ModuleType.POST_QUIZ) {
      const passingScore = module.course.passingScore || 80;
      completed = score >= passingScore;
    }

    // Update progress
    return prisma.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId: enrollment.id,
          moduleId
        }
      },
      update: {
        score,
        completed,
        completedAt: completed ? new Date() : undefined,
        attempts: { increment: 1 }
      },
      create: {
        enrollmentId: enrollment.id,
        moduleId,
        score,
        completed,
        completedAt: completed ? new Date() : undefined,
        attempts: 1
      }
    });
  }
}
