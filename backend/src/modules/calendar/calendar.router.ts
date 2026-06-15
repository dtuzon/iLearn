import { Router } from 'express';
import { CalendarController } from './calendar.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, CalendarController.getEvents);

export default router;
