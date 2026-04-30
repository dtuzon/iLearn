import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../utils/password';
import { Role } from '@prisma/client';
import { parse } from 'csv-parse/sync';

export class UsersService {
  static async getAll(userId: string, role: string, filters: { search?: string, role?: Role, departmentId?: string } = {}) {
    const where: any = {};

    if (role === Role.DEPARTMENT_HEAD) {
      const dept = await prisma.department.findUnique({
        where: { headUserId: userId }
      });
      if (!dept) return [];
      where.departmentId = dept.id;
    }

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId === 'none' ? null : filters.departmentId;
    }

    return prisma.user.findMany({
      where,
      include: { 
        department: true,
        immediateSuperior: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async bulkUpdate(userIds: string[], data: { action: string, role?: Role, departmentId?: string }) {
    switch (data.action) {
      case 'DEACTIVATE':
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        });
      case 'ACTIVATE':
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        });
      case 'CHANGE_ROLE':
        if (!data.role) throw new Error('Role is required');
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: data.role }
        });
      case 'CHANGE_DEPARTMENT':
        const deptId = data.departmentId === 'none' ? null : data.departmentId;
        return prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { departmentId: deptId }
        });
      default:
        throw new Error('Invalid bulk action');
    }
  }

  static async create(data: {
    username: string;
    password?: string;
    role: Role;
    departmentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    immediateSuperiorId?: string;
  }) {
    const passwordHash = await hashPassword(data.password || 'password123');
    return prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        role: data.role,
        departmentId: data.departmentId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        immediateSuperiorId: data.immediateSuperiorId,
        requiresPasswordChange: true // Always true for newly created users with temp passwords
      }
    });
  }


  static async update(id: string, data: Partial<{
    username: string;
    password?: string;
    role: Role;
    departmentId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    immediateSuperiorId: string | null;
  }>) {
    const updateData: any = { ...data };
    
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
      updateData.requiresPasswordChange = true;
      delete updateData.password;
    }

    return prisma.user.update({
      where: { id },
      data: updateData
    });
  }


  static async bulkImport(csvBuffer: Buffer) {
    interface BulkImportRecord {
      username: string;
      password?: string;
      role?: string;
      departmentId?: string;
      immediateSuperiorId?: string;
    }

    const records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as BulkImportRecord[];

    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (const record of records) {
      try {
        const { username, password, role, departmentId, immediateSuperiorId } = record;
        
        await this.create({
          username,
          password,
          role: (role as Role) || Role.EMPLOYEE,
          departmentId: departmentId || undefined,
          immediateSuperiorId: immediateSuperiorId || undefined
        });
        results.success++;
      } catch (err: any) {
        results.errors.push(`Error importing ${record.username}: ${err.message}`);
      }
    }

    return results;
  }

  static async getTeam(userId: string) {
    return prisma.user.findMany({
      where: { immediateSuperiorId: userId },
      include: {
        department: true,
        enrollments: {
          include: {
            course: true
          }
        },
        learningPathEnrollments: {
          include: {
            learningPath: true
          }
        }
      }
    });
  }

  static async changePassword(userId: string, newPassword: string) {

    const passwordHash = await hashPassword(newPassword);
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        requiresPasswordChange: false
      }
    });
  }
}


