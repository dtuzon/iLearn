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

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await CoursesService.getById(id as string);
      res.json(course);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
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

  static async updateCertificateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const designConfig = req.body.designConfig ? JSON.parse(req.body.designConfig) : undefined;
      const backgroundImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      const template = await CoursesService.upsertCertificateTemplate(id as string, {
        backgroundImageUrl,
        designConfig
      });

      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async partialUpdate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await CoursesService.partialUpdate(id as string, req.body);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateModule(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const module = await CoursesService.updateModule(moduleId as string, req.body);
      res.json(module);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteModule(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      await CoursesService.deleteModule(moduleId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
