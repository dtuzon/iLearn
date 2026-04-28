import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      console.log('Login attempt for:', username);
      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error.message);
      res.status(401).json({ message: error.message });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new Error('Not authenticated');
      
      const user = await AuthService.getMe(userId);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }
}
