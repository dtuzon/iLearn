import { prisma } from '../../lib/prisma';

export class DepartmentsService {
  static async getAll() {
    return prisma.department.findMany({
      include: {
        _count: {
          select: { users: true }
        },
        head: {
          select: { id: true, firstName: true, lastName: true, username: true }
        }
      }
    });
  }

  static async create(name: string) {
    return prisma.department.create({
      data: { name }
    });
  }

  static async update(id: string, data: { name?: string; headUserId?: string | null }) {
    return prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        headUserId: data.headUserId
      }
    });
  }
}
