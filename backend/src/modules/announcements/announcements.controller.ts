import { Request, Response } from 'express';
import { AnnouncementsService } from './announcements.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class AnnouncementsController {
  static async getAll(req: Request, res: Response) {
    try {
      const announcements = await AnnouncementsService.getAll();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, content, imageUrl, expiresAt, priority } = req.body;
      const announcement = await AnnouncementsService.create(req.user!.userId, {
        title,
        content,
        imageUrl,
        expiresAt,
        priority
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AnnouncementsService.delete(id as string);

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
