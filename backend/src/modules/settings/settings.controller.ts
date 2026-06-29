import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendTestEmail } from '../../lib/email-service';
import { StorageService } from '../../lib/services/storage.service';
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

      const current = await prisma.systemSettings.findFirst();

      if (files?.logo && files.logo[0]) {
        if (current?.companyLogoUrl) {
          try {
            await StorageService.deleteFile(current.companyLogoUrl);
          } catch (e) {
            console.error('Failed to delete old logo file:', e);
          }
        }
        data.companyLogoUrl = await StorageService.uploadFile(files.logo[0], 'branding');
      }
      if (files?.loginBackground && files.loginBackground[0]) {
        if (current?.loginBackgroundUrl) {
          try {
            await StorageService.deleteFile(current.loginBackgroundUrl);
          } catch (e) {
            console.error('Failed to delete old login background file:', e);
          }
        }
        data.loginBackgroundUrl = await StorageService.uploadFile(files.loginBackground[0], 'branding');
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
