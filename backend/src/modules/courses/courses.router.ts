import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { upload } from '../../middleware/upload.middleware';
import { videoUpload } from '../../middleware/video-upload.middleware';

import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, CoursesController.getAll);
router.get('/:id', authenticate, CoursesController.getById);

router.post(
  '/',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('CREATE_COURSE'),
  CoursesController.create
);

router.get('/:courseId/modules', authenticate, CoursesController.getModules);

router.post(
  '/:courseId/modules',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('ADD_MODULE'),
  CoursesController.addModule
);

router.put(
  '/:id/certificate-template',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  upload.single('certificateBackground'),
  auditLog('UPDATE_CERTIFICATE_TEMPLATE'),
  CoursesController.updateCertificateTemplate
);

router.patch(
  '/:id',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('UPDATE_COURSE'),
  CoursesController.partialUpdate
);

router.patch(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('UPDATE_MODULE'),
  CoursesController.updateModule
);

router.delete(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('DELETE_MODULE'),
  CoursesController.deleteModule
);

router.get(
  '/modules/:moduleId',
  authenticate,
  CoursesController.getModule
);

router.patch(
  '/:id/status',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.LEARNING_MANAGER, Role.ADMINISTRATOR]),
  auditLog('UPDATE_COURSE_STATUS'),
  CoursesController.updateStatus
);

router.post(
  '/modules/video/upload',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  videoUpload.single('video'),
  CoursesController.uploadVideo
);

router.post(
  '/:id/create-draft-version',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('CREATE_COURSE_VERSION'),
  CoursesController.createDraftVersion
);

router.get(
  '/:parentId/versions',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.LEARNING_MANAGER, Role.ADMINISTRATOR]),
  CoursesController.getVersions
);

router.post(
  '/:id/restore-version',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),

  auditLog('RESTORE_COURSE_VERSION'),
  CoursesController.restoreVersion
);

router.put(
  '/:id/unretire',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  auditLog('UNRETIRE_COURSE'),
  CoursesController.unretire
);

router.post(
  '/:id/thumbnail',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  upload.single('thumbnail'),
  CoursesController.uploadThumbnail
);

router.post(
  '/:id/attachments',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  upload.single('file'),
  CoursesController.uploadAttachment
);

router.delete(
  '/attachments/:id',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  CoursesController.deleteAttachment
);

router.post(
  '/modules/:moduleId/verify-attendance',
  authenticate,
  CoursesController.verifyAttendance
);

export default router;


