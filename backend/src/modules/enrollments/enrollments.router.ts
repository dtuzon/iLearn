import { Router } from 'express';
import { EnrollmentsController } from './enrollments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();

router.get('/my-courses', authenticate, EnrollmentsController.getMyEnrollments);
router.post('/:courseId', authenticate, auditLog('ENROLL_IN_COURSE'), EnrollmentsController.enroll);
router.get('/:courseId/progress', authenticate, EnrollmentsController.getProgress);
router.post('/complete-module/:moduleId', authenticate, auditLog('COMPLETE_MODULE'), EnrollmentsController.completeModule);
router.post('/:courseId/advance-progress', authenticate, auditLog('ADVANCE_COURSE_PROGRESS'), EnrollmentsController.advanceProgress);
router.post('/:id/online-evaluation', authenticate, auditLog('SUBMIT_ONLINE_EVALUATION'), EnrollmentsController.submitOnlineEvaluation);

router.post('/bulk', authenticate, auditLog('BULK_ENROLL'), EnrollmentsController.bulkEnroll);

export default router;

