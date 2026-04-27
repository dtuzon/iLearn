import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

// PUBLIC: To allow theme fetching before login
router.get('/', SettingsController.getSettings);

router.put(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  auditLog('UPDATE_SYSTEM_SETTINGS'),
  SettingsController.updateSettings
);

export default router;
