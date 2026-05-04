import { Router } from 'express';
import { LearningPathsController } from './learning-paths.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, LearningPathsController.getAll);
router.get('/:id', authenticate, LearningPathsController.getById);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('CREATE_LEARNING_PATH'),
  LearningPathsController.create
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('UPDATE_LEARNING_PATH'),
  LearningPathsController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('DELETE_LEARNING_PATH'),
  LearningPathsController.delete
);

router.put(
  '/:id/courses',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),


  auditLog('SYNC_LEARNING_PATH_COURSES'),
  LearningPathsController.syncCourses
);

router.post(
  '/:id/enroll',
  authenticate,
  auditLog('ENROLL_LEARNING_PATH'),
  LearningPathsController.enroll
);


import { upload } from '../../middleware/upload.middleware';

router.put(
  '/:id/certificate-template',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  upload.single('certificateBackground'),
  auditLog('UPDATE_LEARNING_PATH_CERTIFICATE'),
  LearningPathsController.updateCertificateTemplate
);

router.patch(
  '/:id/status',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  auditLog('UPDATE_LEARNING_PATH_STATUS'),
  LearningPathsController.updateStatus
);

router.post(
  '/:id/thumbnail',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  upload.single('thumbnail'),
  auditLog('UPDATE_LEARNING_PATH_THUMBNAIL'),
  LearningPathsController.uploadThumbnail
);

router.get(
  '/:id/versions',
  authenticate,
  LearningPathsController.getVersions
);

router.post(
  '/:id/versions',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  auditLog('CREATE_LEARNING_PATH_VERSION'),
  LearningPathsController.createVersion
);

router.delete(
  '/:id/discard-draft',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  auditLog('DISCARD_LEARNING_PATH_DRAFT'),
  LearningPathsController.discardDraft
);

export default router;


