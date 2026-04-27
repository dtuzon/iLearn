import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, CoursesController.getAll);

router.post(
  '/',
  authenticate,
  authorize([Role.LECTURER, Role.ADMINISTRATOR]),
  auditLog('CREATE_COURSE'),
  CoursesController.create
);

router.get('/:courseId/modules', authenticate, CoursesController.getModules);

router.post(
  '/:courseId/modules',
  authenticate,
  authorize([Role.LECTURER, Role.ADMINISTRATOR]),
  auditLog('ADD_MODULE'),
  CoursesController.addModule
);

export default router;
