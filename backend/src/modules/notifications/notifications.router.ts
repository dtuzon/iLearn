import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, NotificationsController.getMyNotifications);
router.put('/:id/read', authenticate, NotificationsController.markRead);

export default router;
