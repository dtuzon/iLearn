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
    if (status === CourseStatus.PUBLISHED) {
      return this.publishCourse(id);
    }
    return prisma.course.update({
      where: { id },
      data: { status }
    });
  }

  static async createDraftVersion(originalId: string) {
    const original = await prisma.course.findUnique({
      where: { id: originalId },
      include: {
        modules: {
          include: {
            quizQuestions: {
              include: {
                options: true
              }
            }
          }
        },
        certificateTemplate: true
      }
    });

    if (!original) throw new Error('Course not found');

    return prisma.$transaction(async (tx) => {
      // Create new course draft
      const clonedCourse = await tx.course.create({
        data: {
          title: `${original.title} (Draft)`,
          description: original.description,
          thumbnailUrl: original.thumbnailUrl,
          passingGrade: original.passingGrade,
          targetAudience: original.targetAudience,
          targetDepartments: original.targetDepartments,
          requires180DayEval: original.requires180DayEval,
          lecturerId: original.lecturerId,
          evaluationFormId: original.evaluationFormId,
          status: CourseStatus.DRAFT,
          version: original.version + 1,
          parentId: original.parentId || original.id,
          isLatest: false,
          modules: {
            create: original.modules.map(module => ({
              title: module.title,
              type: module.type,
              sequenceOrder: module.sequenceOrder,
              contentUrlOrText: module.contentUrlOrText,
              durationSeconds: module.durationSeconds,
              facilitators: module.facilitators,
              shuffleQuestions: module.shuffleQuestions,
              shuffleOptions: module.shuffleOptions,
              activityInstructions: module.activityInstructions,
              activityTemplateUrl: module.activityTemplateUrl,
              checkerType: module.checkerType,
              specificCheckerId: module.specificCheckerId,
              evaluationTemplateId: module.evaluationTemplateId,
              quizQuestions: {
                create: module.quizQuestions.map(q => ({
                  questionText: q.questionText,
                  sequenceOrder: q.sequenceOrder,
                  options: {
                    create: q.options.map(opt => ({
                      optionText: opt.optionText,
                      isCorrect: opt.isCorrect
                    }))
                  }
                }))
              }
            }))
          },
          ...(original.certificateTemplate && {
            certificateTemplate: {
              create: {
                backgroundImageUrl: original.certificateTemplate.backgroundImageUrl,
                designConfig: original.certificateTemplate.designConfig as any
              }
            }
          })
        }
      });

      return clonedCourse;
    });
  }

  static async publishCourse(courseId: string) {
    const current = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!current) throw new Error('Course not found');

    const pId = current.parentId || current.id;

    return prisma.$transaction(async (tx) => {
      // 1. Archive previous published version
      await tx.course.updateMany({
        where: {
          OR: [
            { id: pId },
            { parentId: pId }
          ],
          status: CourseStatus.PUBLISHED,
          id: { not: courseId }
        },
        data: {
          status: CourseStatus.ARCHIVED,
          isLatest: false
        }
      });

      // 2. Publish current draft
      return tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.PUBLISHED,
          isLatest: true
        }
      });
    });
  }
}


