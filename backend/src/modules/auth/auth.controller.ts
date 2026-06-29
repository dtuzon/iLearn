import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { prisma } from '../../lib/prisma';
import { sendPasswordResetEmail } from '../../lib/email-service';
import { hashPassword, validatePasswordComplexity } from '../../utils/password';


export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const sanitizedUsername = String(username || '').replace(/[\r\n]/g, '');
      console.log('Login attempt for:', sanitizedUsername);
      const result = await AuthService.login(username, password);

      // Create login audit log
      try {
        await prisma.auditLog.create({
          data: {
            action: 'USER_LOGIN',
            userId: result.user.id,
            ipAddress: req.ip,
            metadata: {
              username: result.user.username,
              role: result.user.role
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log login action:', logError);
      }

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });

      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error.message);

      // Log failed login attempt
      try {
        const { username } = req.body;
        await prisma.auditLog.create({
          data: {
            action: 'USER_LOGIN_FAILED',
            ipAddress: req.ip,
            metadata: {
              username: String(username || '').substring(0, 100),
              error: error.message
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log failed login action:', logError);
      }

      res.status(401).json({ message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
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
  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new Error('Not authenticated');
      
      const { newPassword } = req.body;
      if (!newPassword) throw new Error('New password is required');

      await UsersService.changePassword(userId, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        throw new Error('Email is required');
      }

      const sanitizedEmail = String(email).trim().toLowerCase();

      const user = await prisma.user.findFirst({
        where: { email: sanitizedEmail }
      });

      const genericResponse = { message: 'If an account is associated with this email, a reset link has been sent.' };

      if (!user || !user.isActive) {
        console.log(`Password reset requested for non-existent or inactive email: ${sanitizedEmail}`);
        res.json(genericResponse);
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password-token?token=${resetToken}`;

      const displayName = user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : user.username;

      await sendPasswordResetEmail(sanitizedEmail, resetLink, displayName);

      try {
        await prisma.auditLog.create({
          data: {
            action: 'USER_PASSWORD_RESET_REQUESTED',
            userId: user.id,
            ipAddress: req.ip,
            metadata: {
              email: sanitizedEmail
            }
          }
        });
      } catch (logErr) {
        console.error('Failed to create password reset request audit log:', logErr);
      }

      res.json(genericResponse);
    } catch (error: any) {
      console.error('ForgotPassword error:', error.message);
      res.status(400).json({ message: error.message });
    }
  }

  static async resetPasswordWithToken(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token) throw new Error('Token is required');
      if (!newPassword) throw new Error('New password is required');

      const sanitizedToken = String(token).trim();

      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: sanitizedToken,
          resetPasswordExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired password reset token.');
      }

      validatePasswordComplexity(newPassword);

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          requiresPasswordChange: false
        }
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: 'USER_PASSWORD_RESET_SUCCESS',
            userId: user.id,
            ipAddress: req.ip,
            metadata: {
              username: user.username
            }
          }
        });
      } catch (logErr) {
        console.error('Failed to create password reset success audit log:', logErr);
      }

      res.json({ message: 'Your password has been successfully reset.' });
    } catch (error: any) {
      console.error('ResetPasswordWithToken error:', error.message);
      res.status(400).json({ message: error.message });
    }
  }
}

