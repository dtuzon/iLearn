import { Router } from 'express';
import { EvaluationsController } from './evaluations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();

router.get('/pending-team', authenticate, EvaluationsController.getPendingTeam);
router.post('/behavioral', authenticate, auditLog('SUBMIT_BEHAVIORAL_EVALUATION'), EvaluationsController.submitBehavioral);

export default router;
