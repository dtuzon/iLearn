import { Request, Response } from 'express';
import { DepartmentsService } from './departments.service';

export class DepartmentsController {
  static async getAll(req: Request, res: Response) {
    try {
      const depts = await DepartmentsService.getAll();
      res.json(depts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const dept = await DepartmentsService.create(name);
      res.status(201).json(dept);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const dept = await DepartmentsService.update(id, req.body);
      res.json(dept);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
