import { prisma } from '../../lib/prisma';
import { CourseStatus } from '@prisma/client';

export class LearningPathsService {
  static async getAll() {
    return prisma.learningPath.findMany({
      include: {
        pathCourses: {
          include: {
            course: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  }

  static async getById(id: string) {
    return prisma.learningPath.findUnique({
      where: { id },
      include: {
        pathCourses: {
          include: {
            course: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        certificateTemplate: true
      }
    });

  }

  static async create(data: any) {
    return prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        targetAudience: data.targetAudience,
        targetDepartments: data.targetDepartments,
        status: data.status || CourseStatus.DRAFT,
        hasCertificate: data.hasCertificate || false

      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.learningPath.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        targetAudience: data.targetAudience,
        targetDepartments: data.targetDepartments,
        status: data.status,
        hasCertificate: data.hasCertificate,
        versionTag: data.versionTag,
        changeSummary: data.changeSummary
      } as any
    });
  }

  static async updateStatus(id: string, status: CourseStatus) {
    return prisma.learningPath.update({
      where: { id },
      data: { status }
    });
  }

  static async uploadThumbnail(id: string, thumbnailUrl: string) {
    return prisma.learningPath.update({
      where: { id },
      data: { thumbnailUrl }
    });
  }


  static async delete(id: string) {
    return prisma.learningPath.delete({
      where: { id }
    });
  }

  static async syncCourses(id: string, courses: { courseId: string; order: number }[]) {
    return prisma.$transaction(async (tx) => {
      // Delete existing associations
      await tx.learningPathCourse.deleteMany({
        where: { learningPathId: id }
      });

      // Create new associations
      if (courses.length > 0) {
        await tx.learningPathCourse.createMany({
          data: courses.map(c => ({
            learningPathId: id,
            courseId: c.courseId,
            order: c.order
          }))
        });
      }

      return tx.learningPath.findUnique({
        where: { id },
        include: {
          pathCourses: {
            include: {
              course: true
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
    });
  }

  static async enroll(userId: string, learningPathId: string, dueDate?: Date) {
    return prisma.learningPathEnrollment.upsert({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId
        }
      },
      update: {
        dueDate: dueDate ? new Date(dueDate) : undefined
      },
      create: {
        userId,
        learningPathId,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });
  }

  static async getUserEnrollments(userId: string) {
    return prisma.learningPathEnrollment.findMany({
      where: { userId },
      include: {
        learningPath: {
          include: {
            pathCourses: {
              include: {
                course: true
              },
              orderBy: {
                order: 'asc'
              }
            },
            certificates: {
              where: { userId }
            }
          }
        }
      }
    });
  }

  static async upsertCertificateTemplate(id: string, data: any) {
    const { backgroundImageUrl, designConfig } = data;
    return prisma.certificateTemplate.upsert({
      where: { learningPathId: id },
      create: {
        learningPathId: id,
        backgroundImageUrl: backgroundImageUrl || '',
        designConfig: designConfig as any
      },
      update: {
        ...(backgroundImageUrl && { backgroundImageUrl }),
        designConfig: designConfig as any
      }
    });
  }

  static async getVersions(parentId: string) {
    return prisma.learningPath.findMany({
      where: {
        OR: [
          { id: parentId },
          { parentId: parentId }
        ]
      } as any,
      orderBy: {
        version: 'desc'
      } as any,
      include: {
        pathCourses: {
          include: {
            course: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: { pathCourses: true }
        }
      }
    });
  }

  static async createVersion(id: string) {
    return prisma.$transaction(async (tx) => {
      const source = await tx.learningPath.findUnique({
        where: { id },
        include: {
          pathCourses: true,
          certificateTemplate: true
        }
      });

      if (!source) throw new Error('Source path not found');

      const pId = (source as any).parentId || source.id;
      const latestVersion = await tx.learningPath.aggregate({
        where: {
          OR: [{ id: pId }, { parentId: pId }]
        } as any,
        _max: { version: true } as any
      });

      const nextVersion = ((latestVersion as any)?._max?.version || 1) + 1;

      // Mark all other versions as not latest
      await tx.learningPath.updateMany({
        where: {
          OR: [{ id: pId }, { parentId: pId }]
        } as any,
        data: { isLatest: false } as any
      });

      // Create the new version
      const newVersion = await tx.learningPath.create({
        data: {
          title: source.title,
          description: source.description,
          thumbnailUrl: source.thumbnailUrl,
          targetAudience: source.targetAudience,
          targetDepartments: source.targetDepartments,
          status: CourseStatus.DRAFT,
          version: nextVersion,
          parentId: pId,
          isLatest: true,
          hasCertificate: source.hasCertificate,
          pathCourses: {
            create: (source as any).pathCourses.map((pc: any) => ({
              courseId: pc.courseId,
              order: pc.order
            }))
          }
        } as any
      });

      // Clone certificate template if exists
      if (source.certificateTemplate) {
        await tx.certificateTemplate.create({
          data: {
            learningPathId: newVersion.id,
            backgroundImageUrl: source.certificateTemplate.backgroundImageUrl,
            designConfig: source.certificateTemplate.designConfig as any
          }
        });
      }

      return newVersion;
    });
  }
}

