import { Response } from 'express';
import { CatalogService } from './catalog.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class CatalogController {
  static async getCatalog(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, type = 'all', sort = 'newest', category } = req.query;
      const catalog = await CatalogService.getCatalog({
        search: search as string,
        type: type as any,
        sort: sort as any,
        category: category as string,
        userId: req.user?.userId
      });
      res.json(catalog);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      res.status(500).json({ message: 'Failed to fetch catalog' });
    }
  }
}
