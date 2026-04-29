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

    if (role === Role.COURSE_CREATOR) {
      // COURSE_CREATORs: Show courses they created
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

  static async getById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        modules: true,
        certificateTemplate: true
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

  static async upsertCertificateTemplate(courseId: string, data: any) {
    const { backgroundImageUrl, nameX, nameY, dateX, dateY } = data;

    const designConfig = {
      placeholders: [
        { key: "{{StudentName}}", x: nameX, y: nameY },
        { key: "{{Date}}", x: dateX, y: dateY }
      ]
    };

    return prisma.certificateTemplate.upsert({
      where: { courseId },
      create: {
        courseId,
        backgroundImageUrl,
        designConfig
      },
      update: {
        ...(backgroundImageUrl && { backgroundImageUrl }),
        designConfig
      }
    });
  }

  static async partialUpdate(id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data
    });
  }
}
