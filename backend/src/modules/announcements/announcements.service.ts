import { prisma } from '../../lib/prisma';

export class AnnouncementsService {
  static async getAll() {
    const now = new Date();
    return prisma.announcement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async create(authorId: string, data: any) {
    return prisma.announcement.create({
      data: {
        ...data,
        authorId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    });
  }

  static async delete(id: string) {
    return prisma.announcement.delete({
      where: { id }
    });
  }
}
