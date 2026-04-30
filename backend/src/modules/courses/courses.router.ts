import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { upload } from '../../middleware/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, CoursesController.getAll);
router.get('/:id', authenticate, CoursesController.getById);

router.post(
  '/',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  auditLog('CREATE_COURSE'),
  CoursesController.create
);

router.get('/:courseId/modules', authenticate, CoursesController.getModules);

router.post(
  '/:courseId/modules',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  auditLog('ADD_MODULE'),
  CoursesController.addModule
);

router.put(
  '/:id/certificate-template',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  upload.single('certificateBackground'),
  auditLog('UPDATE_CERTIFICATE_TEMPLATE'),
  CoursesController.updateCertificateTemplate
);

router.patch(
  '/:id',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  auditLog('UPDATE_COURSE'),
  CoursesController.partialUpdate
);

router.patch(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  auditLog('UPDATE_MODULE'),
  CoursesController.updateModule
);

router.delete(
  '/:courseId/modules/:moduleId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
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

export default router;

