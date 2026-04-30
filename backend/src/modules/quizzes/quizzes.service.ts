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
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      select: { shuffleQuestions: true, shuffleOptions: true }
    });

    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId },
      include: {
        options: {
          select: {
            id: true,
            optionText: true
          }
        }
      }
    });

    let finalQuestions = questions;
    if (module?.shuffleQuestions) {
      finalQuestions = shuffle(finalQuestions);
    }

    return finalQuestions.map((q) => ({
      ...q,
      options: module?.shuffleOptions ? shuffle(q.options) : q.options
    }));
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
      const passingScore = module.course.passingGrade || 80;
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

  static async updateQuestion(questionId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      // Delete existing options
      await tx.quizOption.deleteMany({ where: { questionId } });
      
      // Update question and create new options
      return tx.quizQuestion.update({
        where: { id: questionId },
        data: {
          questionText: data.questionText,
          options: {
            create: data.options.map((opt: any) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect
            }))
          }
        },
        include: { options: true }
      });
    });
  }

  static async deleteQuestion(questionId: string) {
    return prisma.quizQuestion.delete({
      where: { id: questionId }
    });
  }

  static async clearQuestions(moduleId: string) {
    return prisma.quizQuestion.deleteMany({
      where: { moduleId }
    });
  }

  static async syncQuestions(moduleId: string, questions: any[]) {
    return prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { moduleId } });
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
}
