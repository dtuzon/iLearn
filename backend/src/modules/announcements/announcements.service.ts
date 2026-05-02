import { prisma } from '../../lib/prisma';

export class AnnouncementsService {
  static async getAll() {
    return prisma.announcement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true } }
      }
    });
  }


  static async create(authorId: string, data: { title: string; content: string; priority: string; imageUrl?: string; expiresAt?: Date }) {
    return prisma.announcement.create({
      data: {
        ...data,
        authorId
      }
    });
  }


  static async delete(id: string) {
    return prisma.announcement.delete({
      where: { id }
    });
  }
}
