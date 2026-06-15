import { Response } from 'express';
import { CalendarService } from './calendar.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

export class CalendarController {
  static async getEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role as Role;
      const events = await CalendarService.getCalendarEvents(userId, role);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
