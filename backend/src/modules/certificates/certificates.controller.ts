import { Request, Response } from 'express';
import { CertificatesService } from './certificates.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class CertificatesController {
  static async createTemplate(req: Request, res: Response) {
    try {
      const { courseId, designConfig } = req.body;
      const backgroundImageUrl = req.file ? `uploads/certificates/backgrounds/${req.file.filename}` : undefined;

      const template = await CertificatesService.createTemplate(courseId, {
        designConfig: JSON.parse(designConfig),
        backgroundImageUrl
      });
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async generate(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const transcript = await CertificatesService.generateCertificate(req.user!.userId, courseId as string);
      res.json(transcript);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
