import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendTestEmail } from '../../lib/email-service';
import { prisma } from '../../lib/prisma';

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      const user = (req as any).user;
      const sanitized = { ...settings };
      if (!user || user.role !== 'ADMINISTRATOR') {
        delete (sanitized as any).smtpUser;
        delete (sanitized as any).smtpPassword;
      }
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const data = { ...req.body };
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files?.logo) {
        data.companyLogoUrl = `/uploads/${files.logo[0].filename}`;
      }
      if (files?.loginBackground) {
        data.loginBackgroundUrl = `/uploads/${files.loginBackground[0].filename}`;
      }

      // Convert string numbers from FormData back to integers
      if (data.smtpPort) data.smtpPort = parseInt(data.smtpPort);
      if (data.maxUploadSizeMb) data.maxUploadSizeMb = parseInt(data.maxUploadSizeMb);
      if (data.passingScore) data.passingScore = parseInt(data.passingScore);

      const settings = await SettingsService.updateSettings(data);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async sendTestEmail(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true }
      });
      const userEmail = user?.email;
      if (!userEmail) throw new Error('Your account does not have a registered email address.');
      
      const { smtpServer, smtpPort, senderEmail, smtpUser, smtpPassword } = req.body;
      
      await sendTestEmail(userEmail, {
        smtpServer,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        senderEmail,
        smtpUser,
        smtpPassword
      });
      
      res.json({ message: `Test email sent successfully to ${userEmail}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
