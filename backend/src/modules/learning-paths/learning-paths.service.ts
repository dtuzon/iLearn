import { prisma } from '../../lib/prisma';

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
        isPublished: data.isPublished || false,
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
        isPublished: data.isPublished,
        hasCertificate: data.hasCertificate

      }
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

  static async enroll(userId: string, learningPathId: string) {
    return prisma.learningPathEnrollment.upsert({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId
        }
      },
      update: {},
      create: {
        userId,
        learningPathId
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

}

