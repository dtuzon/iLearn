import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class UsersController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, role, departmentId } = req.query;
      const users = await UsersService.getAll(req.user!.userId, req.user!.role, {
        search: search as string,
        role: role as any,
        departmentId: departmentId as string
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async bulkUpdate(req: Request, res: Response) {
    try {
      const { userIds, ...data } = req.body;
      const result = await UsersService.bulkUpdate(userIds, data);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const user = await UsersService.create(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await UsersService.update(id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async bulkImport(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const results = await UsersService.bulkImport(req.file.buffer);
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
