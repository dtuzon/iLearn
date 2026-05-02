import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/metrics', authenticate, DashboardController.getMetrics);

export default router;
