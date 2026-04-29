import { Request, Response } from 'express';
import { SettingsService } from './settings.service';

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      res.json(settings);
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
}
