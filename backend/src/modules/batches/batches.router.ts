import { Router } from 'express';
import { BatchesController } from './batches.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only Admins and Learning Managers can manage batches
router.use(authenticate, authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]));

router.get('/', BatchesController.getAll);
router.get('/:id', BatchesController.getById);
router.post('/', auditLog('CREATE_BATCH'), BatchesController.create);
router.put('/:id', auditLog('UPDATE_BATCH'), BatchesController.update);
router.post('/:id/assign-learners', auditLog('BATCH_ASSIGN_LEARNERS'), BatchesController.assignLearners);
router.patch('/:id/cancel', auditLog('CANCEL_BATCH'), BatchesController.cancel);
router.delete('/:id', auditLog('DELETE_BATCH'), BatchesController.delete);

export default router;
