import { Router } from 'express';
import { DepartmentsController } from './departments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, DepartmentsController.getAll);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  auditLog('CREATE_DEPARTMENT'),
  DepartmentsController.create
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  auditLog('UPDATE_DEPARTMENT'),
  DepartmentsController.update
);

export default router;
