import { Router } from 'express';
import { LearningPathsController } from './learning-paths.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, LearningPathsController.getAll);
router.get('/:id', authenticate, LearningPathsController.getById);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('CREATE_LEARNING_PATH'),
  LearningPathsController.create
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('UPDATE_LEARNING_PATH'),
  LearningPathsController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('DELETE_LEARNING_PATH'),
  LearningPathsController.delete
);

router.put(
  '/:id/courses',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('SYNC_LEARNING_PATH_COURSES'),
  LearningPathsController.syncCourses
);

router.post(
  '/:id/enroll',
  authenticate,
  auditLog('ENROLL_LEARNING_PATH'),
  LearningPathsController.enroll
);


export default router;
