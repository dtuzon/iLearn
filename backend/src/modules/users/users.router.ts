import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER, Role.DEPARTMENT_HEAD]),
  UsersController.getAll
);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  auditLog('CREATE_USER'),
  UsersController.create
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  auditLog('UPDATE_USER'),
  UsersController.update
);

router.post(
  '/bulk-import',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  upload.single('file'),
  auditLog('BULK_IMPORT_USERS'),
  UsersController.bulkImport
);

export default router;
