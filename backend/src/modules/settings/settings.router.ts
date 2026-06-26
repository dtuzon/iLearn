import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate, permissiveAuthenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

// PUBLIC: To allow theme fetching before login
router.get('/', permissiveAuthenticate, SettingsController.getSettings);

router.put(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'loginBackground', maxCount: 1 }
  ]),
  auditLog('UPDATE_SYSTEM_SETTINGS'),
  SettingsController.updateSettings
);

router.post(
  '/test-email',
  authenticate,
  authorize([Role.ADMINISTRATOR]),
  SettingsController.sendTestEmail
);

export default router;
