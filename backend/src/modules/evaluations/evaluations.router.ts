import { Router } from 'express';
import { EvaluationsController } from './evaluations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Template Management (Admin & Learning Manager Only)
router.post('/templates', authenticate, authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]), EvaluationsController.createTemplate);
router.get('/templates', authenticate, EvaluationsController.getTemplates);
router.get('/templates/:id', authenticate, EvaluationsController.getTemplateById);
router.put('/templates/:id', authenticate, authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]), EvaluationsController.updateTemplate);


// Evaluation Responses
router.post('/responses', authenticate, EvaluationsController.submitResponse);
router.get('/responses/course/:courseId', authenticate, EvaluationsController.getResponsesByCourse);

// Behavioral 180-Day Evaluations (Supervisor Only)
router.get('/pending-team', authenticate, EvaluationsController.getPendingTeam);
router.post('/behavioral', authenticate, EvaluationsController.submitBehavioralEvaluation);

export default router;

