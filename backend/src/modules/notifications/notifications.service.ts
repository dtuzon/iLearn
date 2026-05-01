import { prisma } from '../../lib/prisma';

export class NotificationsService {
  static async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
  }

  static async createNotification(data: { userId: string, title: string, message: string, actionUrl?: string }) {
    return prisma.notification.create({
      data
    });
  }
}
