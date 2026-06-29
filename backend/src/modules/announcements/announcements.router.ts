import { Router } from 'express';
import { AnnouncementsController } from './announcements.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';
import { upload } from '../../middleware/upload.middleware';
import { StorageService } from '../../lib/services/storage.service';

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
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    try {
      const imageUrl = await StorageService.uploadFile(req.file, 'announcements');
      res.json({ imageUrl });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
);


router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMINISTRATOR, Role.LEARNING_MANAGER]),
  AnnouncementsController.delete
);

export default router;
