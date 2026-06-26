import { Router } from 'express';
import { ActivitiesController } from './activities.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.post('/submit', authenticate, auditLog('ACTIVITY_SUBMIT'), ActivitiesController.submit);

// Restricted to checker/supervisor/admin roles
router.get(
  '/checkable-batches',
  authenticate,
  authorize([Role.SUPERVISOR, Role.DEPARTMENT_HEAD, Role.ADMINISTRATOR, Role.COURSE_CREATOR, Role.LEARNING_MANAGER]),
  ActivitiesController.getCheckableBatches
);

router.get(
  '/batch-submissions/:batchId',
  authenticate,
  authorize([Role.SUPERVISOR, Role.DEPARTMENT_HEAD, Role.ADMINISTRATOR, Role.COURSE_CREATOR, Role.LEARNING_MANAGER]),
  ActivitiesController.getBatchSubmissions
);

router.get(
  '/batch-essays/:batchId',
  authenticate,
  authorize([Role.SUPERVISOR, Role.DEPARTMENT_HEAD, Role.ADMINISTRATOR, Role.COURSE_CREATOR, Role.LEARNING_MANAGER]),
  ActivitiesController.getBatchEssays
);

router.patch(
  '/submissions/:id/grade',
  authenticate,
  authorize([Role.SUPERVISOR, Role.DEPARTMENT_HEAD, Role.ADMINISTRATOR, Role.COURSE_CREATOR, Role.LEARNING_MANAGER]),
  auditLog('ACTIVITY_GRADE'),
  ActivitiesController.grade
);

export default router;
