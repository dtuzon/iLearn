import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

export class CoursesService {
  static async getAll(userId: string, role: string) {
    if (role === Role.EMPLOYEE) {
      // Employees: Show courses they are enrolled in or that are published
      return prisma.course.findMany({
        where: {
          OR: [
            { isPublished: true },
            { enrollments: { some: { userId } } }
          ]
        },
        include: {
          lecturer: { select: { firstName: true, lastName: true } },
          _count: { select: { modules: true } }
        }
      });
    }

    if (role === Role.LECTURER) {
      // Lecturers: Show courses they created
      return prisma.course.findMany({
        where: { lecturerId: userId },
        include: { _count: { select: { modules: true } } }
      });
    }

    // Admin/HR: See everything
    return prisma.course.findMany({
      include: {
        lecturer: { select: { firstName: true, lastName: true } },
        _count: { select: { modules: true } }
      }
    });
  }

  static async create(lecturerId: string, data: any) {
    return prisma.course.create({
      data: {
        ...data,
        lecturerId
      }
    });
  }

  static async addModule(courseId: string, data: any) {
    // Get highest sequence order
    const lastModule = await prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { sequenceOrder: 'desc' }
    });

    const sequenceOrder = (lastModule?.sequenceOrder ?? -1) + 1;

    return prisma.courseModule.create({
      data: {
        ...data,
        courseId,
        sequenceOrder
      }
    });
  }

  static async getModules(courseId: string) {
    return prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { sequenceOrder: 'asc' }
    });
  }
}
