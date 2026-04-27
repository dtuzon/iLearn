import { Request, Response } from 'express';
import { CoursesService } from './courses.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class CoursesController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const courses = await CoursesService.getAll(req.user!.userId, req.user!.role);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const course = await CoursesService.create(req.user!.userId, req.body);
      res.status(201).json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async addModule(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const module = await CoursesService.addModule(courseId as string, req.body);
      res.status(201).json(module);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getModules(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const modules = await CoursesService.getModules(courseId as string);
      res.json(modules);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
