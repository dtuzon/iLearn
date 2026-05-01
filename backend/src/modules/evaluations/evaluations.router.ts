import { Router } from 'express';
import { EvaluationsController } from './evaluations.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// Template Management (Admin & Learning Manager Only)
router.post('/templates', authenticate, authorize('ADMINISTRATOR', 'LEARNING_MANAGER'), EvaluationsController.createTemplate);
router.get('/templates', authenticate, EvaluationsController.getTemplates);
router.get('/templates/:id', authenticate, EvaluationsController.getTemplateById);
router.put('/templates/:id', authenticate, authorize('ADMINISTRATOR', 'LEARNING_MANAGER'), EvaluationsController.updateTemplate);


// Evaluation Responses
router.post('/responses', authenticate, EvaluationsController.submitResponse);
router.get('/responses/course/:courseId', authenticate, EvaluationsController.getResponsesByCourse);

export default router;
