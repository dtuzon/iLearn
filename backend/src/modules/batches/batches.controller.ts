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

  static async getById(req: Request, res: Response) {
    try {
      const batch = await BatchesService.getById(req.params.id);
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
      const batch = await BatchesService.update(req.params.id, req.body);
      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async assignLearners(req: Request, res: Response) {
    try {
      const { userIds } = req.body;
      await BatchesService.assignLearners(req.params.id, userIds);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await BatchesService.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
