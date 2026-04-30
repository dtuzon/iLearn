import { Request, Response } from 'express';
import { QuizzesService } from './quizzes.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class QuizzesController {
  static async addQuestions(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const { questions } = req.body;
      await QuizzesService.addQuestions(moduleId as string, questions);
      res.status(201).json({ message: 'Questions added successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getQuiz(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const quiz = await QuizzesService.getQuizForEmployee(moduleId as string);
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

  static async updateQuestion(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const question = await QuizzesService.updateQuestion(questionId as string, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteQuestion(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      await QuizzesService.deleteQuestion(questionId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async clearQuestions(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      await QuizzesService.clearQuestions(moduleId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async syncQuestions(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const { questions } = req.body;
      await QuizzesService.syncQuestions(moduleId as string, questions);
      res.json({ message: 'Quiz synced successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
