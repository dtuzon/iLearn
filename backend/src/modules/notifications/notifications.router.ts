import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, NotificationsController.getMyNotifications);
router.patch('/:id/read', authenticate, NotificationsController.markAsRead);
router.patch('/mark-all-read', authenticate, NotificationsController.markAllAsRead);

export default router;
