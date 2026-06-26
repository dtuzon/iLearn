import { Request, Response } from 'express';
import { QuizzesService } from './quizzes.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class QuizzesController {
  static async addQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { questions } = req.body;

      if (req.user!.role === Role.COURSE_CREATOR) {
        const moduleObj = await prisma.courseModule.findUnique({
          where: { id: moduleId as string },
          include: { course: true }
        });
        if (!moduleObj) return res.status(404).json({ message: 'Module not found' });
        if ((moduleObj as any).course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own the course this module belongs to.' });
        }
      }

      await QuizzesService.addQuestions(moduleId as string, questions);
      res.status(201).json({ message: 'Questions added successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getQuiz(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const userRole = req.user?.role;
      
      let quiz;
      if (userRole === Role.ADMINISTRATOR || userRole === Role.LEARNING_MANAGER || userRole === Role.COURSE_CREATOR) {
        if (userRole === Role.COURSE_CREATOR) {
          const moduleObj = await prisma.courseModule.findUnique({
            where: { id: moduleId as string },
            include: { course: true }
          });
          if (!moduleObj || (moduleObj as any).course.lecturerId !== req.user!.userId) {
            // Course Creators who do not own this course should only see the employee view (correct answers stripped)
            quiz = await QuizzesService.getQuizForEmployee(moduleId as string);
          } else {
            quiz = await QuizzesService.getModuleQuestionsForCreator(moduleId as string);
          }
        } else {
          quiz = await QuizzesService.getModuleQuestionsForCreator(moduleId as string);
        }
      } else {
        quiz = await QuizzesService.getQuizForEmployee(moduleId as string);
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async submitQuiz(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { answers } = req.body;
      const progress = await QuizzesService.submitQuiz(req.user!.userId, moduleId as string, answers);
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { questionId } = req.params;

      if (req.user!.role === Role.COURSE_CREATOR) {
        const question = await prisma.quizQuestion.findUnique({
          where: { id: questionId as string },
          include: { module: { include: { course: true } } }
        });
        if (!question) return res.status(404).json({ message: 'Question not found' });
        if ((question as any).module.course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own the course this question belongs to.' });
        }
      }

      const question = await QuizzesService.updateQuestion(questionId as string, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { questionId } = req.params;

      if (req.user!.role === Role.COURSE_CREATOR) {
        const question = await prisma.quizQuestion.findUnique({
          where: { id: questionId as string },
          include: { module: { include: { course: true } } }
        });
        if (!question) return res.status(404).json({ message: 'Question not found' });
        if ((question as any).module.course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own the course this question belongs to.' });
        }
      }

      await QuizzesService.deleteQuestion(questionId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async clearQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;

      if (req.user!.role === Role.COURSE_CREATOR) {
        const moduleObj = await prisma.courseModule.findUnique({
          where: { id: moduleId as string },
          include: { course: true }
        });
        if (!moduleObj) return res.status(404).json({ message: 'Module not found' });
        if ((moduleObj as any).course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own the course this module belongs to.' });
        }
      }

      await QuizzesService.clearQuestions(moduleId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async syncQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { questions } = req.body;

      if (req.user!.role === Role.COURSE_CREATOR) {
        const moduleObj = await prisma.courseModule.findUnique({
          where: { id: moduleId as string },
          include: { course: true }
        });
        if (!moduleObj) return res.status(404).json({ message: 'Module not found' });
        if ((moduleObj as any).course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own the course this module belongs to.' });
        }
      }

      await QuizzesService.syncQuestions(moduleId as string, questions);
      res.json({ message: 'Quiz synced successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getEssaySubmissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const submissions = await QuizzesService.getEssaySubmissions(moduleId as string, req.user!.userId, req.user!.role);
      res.json(submissions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async gradeEssay(req: AuthenticatedRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const { score, feedback } = req.body;
      if (score === undefined || score === null) return res.status(400).json({ message: 'score is required' });
      const result = await QuizzesService.gradeEssay(
        submissionId as string,
        req.user!.userId,
        Number(score),
        feedback || ''
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
