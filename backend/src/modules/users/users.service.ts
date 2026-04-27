import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../utils/password';
import { Role } from '@prisma/client';
import { parse } from 'csv-parse/sync';

export class UsersService {
  static async getAll(userId: string, role: string) {
    if (role === Role.DEPARTMENT_HEAD) {
      // Dept Head: Only see users in their department
      const dept = await prisma.department.findUnique({
        where: { headUserId: userId }
      });
      if (!dept) return [];
      
      return prisma.user.findMany({
        where: { departmentId: dept.id },
        include: { department: true }
      });
    }

    // Admin/HR: See everyone
    return prisma.user.findMany({
      include: { department: true }
    });
  }

  static async create(data: {
    username: string;
    password?: string;
    role: Role;
    departmentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
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
        email: data.email
      }
    });
  }

  static async update(id: string, data: Partial<{
    username: string;
    role: Role;
    departmentId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  }>) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  static async bulkImport(csvBuffer: Buffer) {
    interface BulkImportRecord {
      username: string;
      password?: string;
      role?: string;
      departmentId?: string;
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
        const { username, password, role, departmentId } = record;
        
        await this.create({
          username,
          password,
          role: (role as Role) || Role.EMPLOYEE,
          departmentId: departmentId || undefined
        });
        results.success++;
      } catch (err: any) {
        results.errors.push(`Error importing ${record.username}: ${err.message}`);
      }
    }

    return results;
  }
}
