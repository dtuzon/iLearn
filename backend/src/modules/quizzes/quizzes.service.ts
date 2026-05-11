import { prisma } from '../../lib/prisma';
import { shuffle } from '../../utils/shuffle';
import { ModuleType, CourseModule, QuestionType } from '@prisma/client';

interface ExtendedCourseModule extends CourseModule {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

// ─── Types for submission payload ────────────────────────────────────────────

export type QuizAnswer =
  | { questionId: string; optionId: string }                  // MULTIPLE_CHOICE / TRUE_FALSE
  | { questionId: string; enumerationText: string }           // ENUMERATION
  | { questionId: string; essayText: string };                // ESSAY

export class QuizzesService {
  // ─── Builder: Sync all questions (replace-all strategy) ──────────────────

  static async syncQuestions(moduleId: string, questions: any[]) {
    return prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { moduleId } });

      for (const q of questions) {
        const qType: QuestionType = q.type || 'MULTIPLE_CHOICE';

        // TRUE_FALSE: always override with canonical options
        let optionsData: { optionText: string; isCorrect: boolean }[] = [];

        if (qType === 'TRUE_FALSE') {
          const correctIsTrue = q.correctAnswer === 'true' || q.correctAnswer === true;
          optionsData = [
            { optionText: 'True',  isCorrect: correctIsTrue },
            { optionText: 'False', isCorrect: !correctIsTrue },
          ];
        } else if (qType === 'ESSAY') {
          optionsData = []; // No options for essays
        } else {
          // MULTIPLE_CHOICE and ENUMERATION both store their answers as options
          optionsData = (q.options || []).map((opt: any) => ({
            optionText: opt.optionText,
            isCorrect:  opt.isCorrect,
          }));
        }

        await tx.quizQuestion.create({
          data: {
            questionText: q.questionText,
            type:         qType,
            essayPrompt:  qType === 'ESSAY' ? (q.essayPrompt || null) : null,
            maxScore:     qType === 'ESSAY' ? (q.maxScore ? parseInt(q.maxScore) : null) : null,
            enumCaseSensitive:     qType === 'ENUMERATION' ? Boolean(q.enumCaseSensitive) : false,
            enumOrderMatters:      qType === 'ENUMERATION' ? Boolean(q.enumOrderMatters) : false,
            enumStrictPunctuation: qType === 'ENUMERATION' ? Boolean(q.enumStrictPunctuation) : false,
            moduleId,
            options: { create: optionsData },
          },
        });
      }
    });
  }

  // ─── Legacy add (kept for backward-compat) ───────────────────────────────

  static async addQuestions(moduleId: string, questions: any[]) {
    return this.syncQuestions(moduleId, questions);
  }

  // ─── Fetch for learner (strips isCorrect) ─────────────────────────────────

  static async getQuizForEmployee(moduleId: string) {
    const module = await prisma.courseModule.findUnique({ where: { id: moduleId } });
    const mod = module as unknown as ExtendedCourseModule;

    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId },
      include: {
        options: { select: { id: true, optionText: true } },
      },
    });

    let finalQuestions = mod?.shuffleQuestions ? shuffle(questions) : questions;

    return finalQuestions.map((q) => ({
      ...q,
      options: mod?.shuffleOptions ? shuffle(q.options) : q.options,
    }));
  }

  // ─── Fetch for creator (includes isCorrect) ───────────────────────────────

  static async getModuleQuestionsForCreator(moduleId: string) {
    return prisma.quizQuestion.findMany({
      where: { moduleId },
      include: { options: true },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  // ─── Submit quiz ──────────────────────────────────────────────────────────

  static async submitQuiz(userId: string, moduleId: string, answers: QuizAnswer[]) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new Error('Module not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: module.courseId } },
    });
    if (!enrollment) throw new Error('User not enrolled');

    // Fetch all questions with their correct options
    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId },
      include: { options: { where: { isCorrect: true } } },
    });

    let correctCount   = 0;
    let gradableCount  = 0; // MC + TF + ENUMERATION
    let hasEssay       = false;

    for (const q of questions) {
      const answer = answers.find((a) => a.questionId === q.id);
      if (!answer) continue;

      switch (q.type) {
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE': {
          gradableCount++;
          const correctOptionId = q.options[0]?.id;
          if ('optionId' in answer && answer.optionId === correctOptionId) correctCount++;
          break;
        }

        case 'ENUMERATION': {
          gradableCount++;
          if ('enumerationText' in answer) {
            let submittedArray = answer.enumerationText.split(',');
            let correctArray = q.options.map((o) => o.optionText);

            // Apply punctuation stripping if NOT strict
            if (!q.enumStrictPunctuation) {
              const stripPunctuation = (str: string) => str.replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ');
              submittedArray = submittedArray.map(stripPunctuation);
              correctArray = correctArray.map(stripPunctuation);
            }

            // Apply case sensitivity
            if (!q.enumCaseSensitive) {
              submittedArray = submittedArray.map((s) => s.toLowerCase());
              correctArray = correctArray.map((s) => s.toLowerCase());
            }

            // Always trim spaces around answers
            submittedArray = submittedArray.map((s) => s.trim());
            correctArray = correctArray.map((s) => s.trim());

            // Apply order sensitivity
            if (!q.enumOrderMatters) {
              submittedArray.sort();
              correctArray.sort();
            }

            if (JSON.stringify(submittedArray) === JSON.stringify(correctArray)) correctCount++;
          }
          break;
        }

        case 'ESSAY': {
          hasEssay = true;
          if ('essayText' in answer && answer.essayText.trim()) {
            // Upsert essay submission for checker review
            await prisma.essaySubmission.upsert({
              where: { userId_questionId: { userId, questionId: q.id } },
              update: {
                response:    answer.essayText,
                status:      'PENDING_REVIEW',
                score:       null,
                feedback:    null,
                gradedById:  null,
                gradedAt:    null,
                submittedAt: new Date(),
              },
              create: {
                userId,
                questionId: q.id,
                moduleId,
                response:   answer.essayText,
                status:     'PENDING_REVIEW',
              },
            });
          }
          break;
        }
      }
    }

    const score = gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : 0;

    // Determine pass/completion
    let completed = true;
    let message   = 'Module completed successfully.';

    if (module.type === ModuleType.POST_QUIZ) {
      const passingScore = module.course.passingGrade || 80;

      if (hasEssay && gradableCount === 0) {
        // Pure-essay quiz — goes to pending grading
        completed = false;
        message   = 'Your essay has been submitted and is awaiting checker review.';
      } else {
        completed = score >= passingScore;
        message   = completed
          ? `Passed! You scored ${score}% on the auto-graded questions.${hasEssay ? ' Your essay is pending checker review.' : ''}`
          : `Failed. You scored ${score}%, but ${passingScore}% is required. Please try again.`;
      }
    } else if (module.type === ModuleType.PRE_QUIZ) {
      completed = true;
      message   = `Pre-Quiz complete. You scored ${score}%.${hasEssay ? ' Your essay is pending review.' : ''}`;
    }

    // Update module progress
    await prisma.moduleProgress.upsert({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
      update: {
        score,
        completed,
        completedAt: completed ? new Date() : undefined,
        attempts: { increment: 1 },
      },
      create: {
        enrollmentId: enrollment.id,
        moduleId,
        score,
        completed,
        completedAt: completed ? new Date() : undefined,
        attempts: 1,
      },
    });

    return { score, passed: completed, message, hasEssay };
  }

  // ─── Individual question CRUD ─────────────────────────────────────────────

  static async updateQuestion(questionId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      await tx.quizOption.deleteMany({ where: { questionId } });

      const qType: QuestionType = data.type || 'MULTIPLE_CHOICE';
      let optionsData: { optionText: string; isCorrect: boolean }[] = [];

      if (qType === 'TRUE_FALSE') {
        const correctIsTrue = data.correctAnswer === 'true' || data.correctAnswer === true;
        optionsData = [
          { optionText: 'True',  isCorrect: correctIsTrue },
          { optionText: 'False', isCorrect: !correctIsTrue },
        ];
      } else if (qType !== 'ESSAY') {
        optionsData = (data.options || []).map((opt: any) => ({
          optionText: opt.optionText,
          isCorrect:  opt.isCorrect,
        }));
      }

      return tx.quizQuestion.update({
        where: { id: questionId },
        data: {
          questionText: data.questionText,
          type:         qType,
          essayPrompt:  qType === 'ESSAY' ? (data.essayPrompt || null) : null,
          maxScore:     qType === 'ESSAY' ? (data.maxScore ? parseInt(data.maxScore) : null) : null,
          enumCaseSensitive:     qType === 'ENUMERATION' ? Boolean(data.enumCaseSensitive) : false,
          enumOrderMatters:      qType === 'ENUMERATION' ? Boolean(data.enumOrderMatters) : false,
          enumStrictPunctuation: qType === 'ENUMERATION' ? Boolean(data.enumStrictPunctuation) : false,
          options:      { create: optionsData },
        },
        include: { options: true },
      });
    });
  }

  static async deleteQuestion(questionId: string) {
    return prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  static async clearQuestions(moduleId: string) {
    return prisma.quizQuestion.deleteMany({ where: { moduleId } });
  }

  // ─── Essay: list submissions for a module (checker view) ─────────────────

  static async getEssaySubmissions(moduleId: string) {
    return prisma.essaySubmission.findMany({
      where: { moduleId },
      include: {
        question: { select: { questionText: true, essayPrompt: true, maxScore: true } },
        user:     { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ─── Essay: grade a single submission ────────────────────────────────────

  static async gradeEssay(
    submissionId: string,
    graderId: string,
    score: number,
    feedback: string
  ) {
    // Fetch submission to validate score against maxScore
    const submission = await prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { question: { select: { maxScore: true } } },
    });
    if (!submission) throw new Error('Submission not found');

    const max = submission.question.maxScore;
    if (max !== null && score > max) {
      throw new Error(`Score ${score} exceeds maxScore of ${max}`);
    }
    if (score < 0) throw new Error('Score cannot be negative');

    return prisma.essaySubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback,
        gradedById: graderId,
        gradedAt:   new Date(),
        status:     'APPROVED',
      },
    });
  }
}
