import { prisma } from '../../lib/prisma';
import { comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';

export class AuthService {
  static async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { department: true }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = signToken({ userId: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department?.name,
        firstName: user.firstName,
        lastName: user.lastName,
        requiresPasswordChange: user.requiresPasswordChange
      }
    };

  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        requiresPasswordChange: true
      }
    });



    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
