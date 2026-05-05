import { Router } from 'express';
import { ActivitiesController } from './activities.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();

router.use(authenticate);

router.post('/submit', auditLog('ACTIVITY_SUBMIT'), ActivitiesController.submit);
router.get('/checkable-batches', ActivitiesController.getCheckableBatches);
router.get('/batch-submissions/:batchId', ActivitiesController.getBatchSubmissions);
router.patch('/submissions/:id/grade', auditLog('ACTIVITY_GRADE'), ActivitiesController.grade);

export default router;
