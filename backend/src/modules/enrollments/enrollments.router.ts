import { Router } from 'express';
import { EnrollmentsController } from './enrollments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/my-courses', authenticate, EnrollmentsController.getMyEnrollments);

// IMPORTANT: /bulk must come before /:courseId to prevent routing conflicts
router.post('/bulk', authenticate, authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]), auditLog('BULK_ENROLL'), EnrollmentsController.bulkEnroll);

router.post('/:courseId', authenticate, auditLog('ENROLL_IN_COURSE'), EnrollmentsController.enroll);
router.get('/:courseId/progress', authenticate, EnrollmentsController.getProgress);
router.post('/complete-module/:moduleId', authenticate, auditLog('COMPLETE_MODULE'), EnrollmentsController.completeModule);
router.post('/:courseId/advance-progress', authenticate, auditLog('ADVANCE_COURSE_PROGRESS'), EnrollmentsController.advanceProgress);
router.post('/:id/online-evaluation', authenticate, auditLog('SUBMIT_ONLINE_EVALUATION'), EnrollmentsController.submitOnlineEvaluation);

export default router;
