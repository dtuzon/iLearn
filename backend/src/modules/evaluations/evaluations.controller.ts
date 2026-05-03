import { Request, Response } from 'express';
import { EvaluationsService } from './evaluations.service';
import { TemplateCategory } from '@prisma/client';

export class EvaluationsController {
  // Templates
  static async createTemplate(req: Request, res: Response) {
    try {
      const template = await EvaluationsService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getTemplates(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const templates = await EvaluationsService.getTemplates(category as any);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getTemplateById(req: Request, res: Response) {
    try {
      const template = await EvaluationsService.getTemplateById(req.params.id as string);
      if (!template) return res.status(404).json({ message: 'Template not found' });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateTemplate(req: Request, res: Response) {
    try {
      const template = await EvaluationsService.updateTemplate(req.params.id as string, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // Responses
  static async submitResponse(req: Request, res: Response) {
    try {
      const response = await EvaluationsService.submitResponse({
        ...req.body,
        userId: (req as any).user.userId
      });
      res.status(201).json(response);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getResponsesByCourse(req: Request, res: Response) {
    try {
      const responses = await EvaluationsService.getResponsesByCourse(req.params.courseId as string);

      res.json(responses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getPendingTeam(req: Request, res: Response) {
    try {
      const supervisorId = (req as any).user.userId;
      const pending = await EvaluationsService.getPendingTeam(supervisorId);
      res.json(pending);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async submitBehavioralEvaluation(req: Request, res: Response) {
    try {
      const evaluatorId = (req as any).user.userId;
      const evaluation = await EvaluationsService.submitBehavioralEvaluation({
        ...req.body,
        evaluatorId
      });
      res.status(201).json(evaluation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

