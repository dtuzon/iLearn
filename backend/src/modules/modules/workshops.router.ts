import { Router } from 'express';
import { WorkshopsController } from './workshops.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/workshops/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get(
  '/pending',
  authenticate,
  WorkshopsController.getPending
);

router.get(
  '/:moduleId/my-submission',
  authenticate,
  WorkshopsController.getMySubmission
);

router.post(
  '/:moduleId/submit',
  authenticate,
  upload.single('file'),
  auditLog('SUBMIT_WORKSHOP'),
  WorkshopsController.submit
);

router.post(
  '/upload-template',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  upload.single('file'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/workshops/${req.file.filename}` });
  }
);

router.post(
  '/:submissionId/review',

  authenticate,
  auditLog('REVIEW_WORKSHOP'),
  WorkshopsController.review
);

export default router;
