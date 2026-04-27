import { Router } from 'express';
import { EnrollmentsController } from './enrollments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();

router.post('/:courseId', authenticate, auditLog('ENROLL_IN_COURSE'), EnrollmentsController.enroll);
router.get('/:courseId/progress', authenticate, EnrollmentsController.getProgress);
router.post('/complete-module/:moduleId', authenticate, auditLog('COMPLETE_MODULE'), EnrollmentsController.completeModule);

export default router;
