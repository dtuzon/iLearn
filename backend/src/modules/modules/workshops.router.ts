import { Router } from 'express';
import { WorkshopsController } from './workshops.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/workshops/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post(
  '/:moduleId/submit',
  authenticate,
  upload.single('file'),
  auditLog('SUBMIT_WORKSHOP'),
  WorkshopsController.submit
);

router.post(
  '/:moduleId/grade',
  authenticate,
  authorize([Role.LECTURER, Role.ADMINISTRATOR]),
  auditLog('GRADE_WORKSHOP'),
  WorkshopsController.grade
);

export default router;
