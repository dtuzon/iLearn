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
      const settings = await SettingsService.updateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
