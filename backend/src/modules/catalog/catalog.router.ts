import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, CatalogController.getCatalog);

export default router;
