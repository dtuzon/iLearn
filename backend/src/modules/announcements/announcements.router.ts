import { Router } from 'express';
import { AnnouncementsController } from './announcements.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, AnnouncementsController.getAll);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  AnnouncementsController.create
);

router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  AnnouncementsController.delete
);

export default router;
