import { prisma } from '../../lib/prisma';
import { Role, CourseStatus } from '@prisma/client';



export class CoursesService {
  static async getAll(userId: string, role: string) {
    if (role === Role.EMPLOYEE) {
      // Employees: Show courses they are enrolled in or that are published
      return prisma.course.findMany({
        where: {
          OR: [
            { status: CourseStatus.PUBLISHED },
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

  static async getModule(id: string) {
    return prisma.courseModule.findUnique({
      where: { id }
    });
  }

  static async upsertCertificateTemplate(courseId: string, data: any) {
    const { backgroundImageUrl, designConfig } = data;

    return prisma.certificateTemplate.upsert({
      where: { courseId },
      create: {
        courseId,
        backgroundImageUrl: backgroundImageUrl || '',
        designConfig: designConfig as any
      },
      update: {
        ...(backgroundImageUrl && { backgroundImageUrl }),
        designConfig: designConfig as any
      }
    });
  }

  static async partialUpdate(id: string, data: any) {
    return prisma.course.update({
      where: { id },
      data
    });
  }

  static async updateModule(id: string, data: any) {
    return prisma.courseModule.update({
      where: { id },
      data
    });
  }

  static async deleteModule(id: string) {
    return prisma.courseModule.delete({
      where: { id }
    });
  }

  static async updateStatus(id: string, status: CourseStatus) {
    return prisma.course.update({
      where: { id },
      data: { status }
    });
  }
}

