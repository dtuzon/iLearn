import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class NotificationsController {
  static async getMyNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const notifications = await NotificationsService.getUserNotifications(req.user!.userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await NotificationsService.markAsRead(id as string, req.user!.userId);
      res.json({ success: true, message: 'Marked as read' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationsService.markAllAsRead(req.user!.userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
