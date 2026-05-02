import { Router } from 'express';
import { AnnouncementsController } from './announcements.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

router.get('/', authenticate, AnnouncementsController.getAll);

router.post(
  '/',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  AnnouncementsController.create
);

router.post(
  '/upload',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  }
);


router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  AnnouncementsController.delete
);

export default router;
