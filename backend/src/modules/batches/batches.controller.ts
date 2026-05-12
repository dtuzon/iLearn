import { Request, Response } from 'express';
import { BatchesService } from './batches.service';

export class BatchesController {
  static async getAll(req: Request, res: Response) {
    try {
      const batches = await BatchesService.getAll();
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getAnalytics(req: Request, res: Response) {
    try {
      const filters = {
        departmentId: req.query.departmentId as string | undefined,
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined
      };
      const analytics = await BatchesService.getAnalytics(req.params.id as string, filters);
      res.json(analytics);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const batch = await BatchesService.getById(req.params.id as string);
      if (!batch) return res.status(404).json({ message: 'Batch not found' });
      res.json(batch);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const batch = await BatchesService.create(req.body);
      res.status(201).json(batch);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const batch = await BatchesService.update(req.params.id as string, req.body);
      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async assignLearners(req: Request, res: Response) {
    try {
      const { userIds } = req.body;
      await BatchesService.assignLearners(req.params.id as string, userIds);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      const result = await BatchesService.cancel(req.params.id as string, reason);
      res.json(result);
    } catch (error: any) {
      const status = error.message === 'Batch is already cancelled' ? 409 : 400;
      res.status(status).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await BatchesService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
