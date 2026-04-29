import { Router } from 'express';
import { CertificatesController } from './certificates.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/certificates/backgrounds/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'bg-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post(
  '/templates',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  upload.single('background'),
  auditLog('CREATE_CERTIFICATE_TEMPLATE'),
  CertificatesController.createTemplate
);

router.post(
  '/:courseId/generate',
  authenticate,
  auditLog('GENERATE_CERTIFICATE'),
  CertificatesController.generate
);

export default router;
