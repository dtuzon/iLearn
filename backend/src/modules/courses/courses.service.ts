import { prisma } from '../../lib/prisma';
import { Role, CourseStatus } from '@prisma/client';
import { EnrollmentsService } from '../enrollments/enrollments.service';




export class CoursesService {
  static async getAll(userId: string, role: string, tab: string = 'active') {
    const isRetired = tab === 'retired';
    const isPending = tab === 'pending';

    
    if (role === Role.EMPLOYEE) {
      // Employees: Show latest active published courses or enrolled ones
      return prisma.course.findMany({
        where: {
          isLatest: true,
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


    
    const baseWhere: any = {
      status: isRetired 
        ? CourseStatus.RETIRED 
        : (isPending ? CourseStatus.PENDING_APPROVAL : { not: CourseStatus.RETIRED })
    };


    if (role === Role.COURSE_CREATOR) {
      baseWhere.lecturerId = userId;
    }

    const courses = await prisma.course.findMany({
      where: {
        ...baseWhere,
        OR: [
          { isLatest: true },
          { status: CourseStatus.DRAFT, parentId: { not: null } }
        ]
      },
      include: {
        lecturer: { select: { firstName: true, lastName: true } },
        _count: { select: { modules: true } }
      }
    });

    // Post-process to prioritize DRAFTs in the same lineage for management view
    const lineageMap = new Map();
    courses.forEach(course => {
      const lineageId = course.parentId || course.id;
      const existing = lineageMap.get(lineageId);
      
      // Prioritize DRAFT over others for management
      if (!existing || course.status === CourseStatus.DRAFT) {
        lineageMap.set(lineageId, course);
      }
    });

    return Array.from(lineageMap.values());


  }

  static async getById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            attachments: true
          }
        },

        certificateTemplate: true,
        attachments: {
          where: { moduleId: null } // Only global ones here
        }
      }
    });

  }

  static async create(lecturerId: string, data: any) {
    return prisma.course.create({
      data: {
        ...data,
        lecturerId,
        isLatest: true,
        version: 1
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
      where: { id },
      include: { attachments: true }
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

  static async updateStatus(id: string, status: CourseStatus, approverId?: string) {
    if (status === CourseStatus.PUBLISHED) {
      return this.publishCourse(id, approverId);
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
        certificateTemplate: true,
        attachments: true
      }

    });

    if (!original) throw new Error('Course not found');
    if (original.status !== CourseStatus.PUBLISHED) {
      throw new Error('Can only create a new version from a Published course.');
    }


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
          introContent: original.introContent,
          closingContent: original.closingContent,
          attachments: {
            create: original.attachments.map(att => ({
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileSize: att.fileSize,
              fileType: att.fileType
            }))
          },

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
              meetingUrl: module.meetingUrl,
              scheduledAt: module.scheduledAt,
              attendanceCode: module.attendanceCode,
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

  static async publishCourse(courseId: string, approverId?: string) {

    const current = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!current) throw new Error('Course not found');

    const pId = current.parentId || current.id;

    return prisma.$transaction(async (tx) => {
      // 1. Archive previous active version (Published or Retired)
      await tx.course.updateMany({
        where: {
          OR: [
            { id: pId },
            { parentId: pId }
          ],
          status: { in: [CourseStatus.PUBLISHED, CourseStatus.RETIRED] },
          id: { not: courseId }
        },
        data: {
          status: CourseStatus.ARCHIVED,
          isLatest: false
        }
      });

      // 2. Delete any "Ghost" drafts or pending approvals in this lineage
      await tx.course.deleteMany({
        where: {
          OR: [
            { id: pId },
            { parentId: pId }
          ],
          status: { in: [CourseStatus.DRAFT, CourseStatus.PENDING_APPROVAL] },
          id: { not: courseId }
        }
      });

      // 3. Publish current draft

      return tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.PUBLISHED,
          isLatest: true,
          approvedById: approverId
        }

      });
    });
  }

  static async getVersions(parentId: string) {
    return prisma.course.findMany({
      where: {
        OR: [
          { id: parentId },
          { parentId: parentId }
        ]
      },
      orderBy: { version: 'desc' },
      include: {
        lecturer: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } }
      }

    });
  }

  static async restoreVersion(versionId: string) {
    const versionToRestore = await prisma.course.findUnique({
      where: { id: versionId },
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
        certificateTemplate: true,
        attachments: true
      }
    });


    if (!versionToRestore) throw new Error('Version not found');

    if (versionToRestore.status !== CourseStatus.ARCHIVED && versionToRestore.status !== CourseStatus.RETIRED) {
      throw new Error('Can only restore from Archived or Retired versions.');
    }


    const pId = versionToRestore.parentId || versionToRestore.id;
    const latestVersion = await prisma.course.findFirst({
      where: {
        OR: [
          { id: pId },
          { parentId: pId }
        ]
      },
      orderBy: { version: 'desc' }
    });

    const newVersionNum = (latestVersion?.version || 0) + 1;

    return prisma.$transaction(async (tx) => {
      return tx.course.create({
        data: {
          title: `${versionToRestore.title} (Restored v${versionToRestore.version})`,
          description: versionToRestore.description,
          thumbnailUrl: versionToRestore.thumbnailUrl,
          passingGrade: versionToRestore.passingGrade,
          targetAudience: versionToRestore.targetAudience,
          targetDepartments: versionToRestore.targetDepartments,
          requires180DayEval: versionToRestore.requires180DayEval,
          lecturerId: versionToRestore.lecturerId,
          evaluationFormId: versionToRestore.evaluationFormId,
          status: CourseStatus.DRAFT,
          version: newVersionNum,
          parentId: pId,
          isLatest: true,
          introContent: versionToRestore.introContent,
          closingContent: versionToRestore.closingContent,
          attachments: {
            create: versionToRestore.attachments.map(att => ({
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileSize: att.fileSize,
              fileType: att.fileType
            }))
          },

          modules: {

            create: versionToRestore.modules.map(module => ({
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
              meetingUrl: module.meetingUrl,
              scheduledAt: module.scheduledAt,
              attendanceCode: module.attendanceCode,
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
          ...(versionToRestore.certificateTemplate && {
            certificateTemplate: {
              create: {
                backgroundImageUrl: versionToRestore.certificateTemplate.backgroundImageUrl,
                designConfig: versionToRestore.certificateTemplate.designConfig as any
              }
            }
          })
        }
      });
    });
  }

  static async unretire(id: string) {
    const course = await prisma.course.findUnique({
      where: { id }
    });

    if (!course) throw new Error('Course not found');

    const pId = course.parentId || course.id;
    const activeSibling = await prisma.course.findFirst({
      where: {
        OR: [{ id: pId }, { parentId: pId }],
        isLatest: true,
        id: { not: id }
      }
    });

    return prisma.course.update({
      where: { id },
      data: { 
        status: CourseStatus.DRAFT,
        isLatest: !activeSibling
      }
    });
  }

  static async addAttachment(courseId: string, data: { fileName: string, fileUrl: string, fileSize: number, fileType: string, moduleId?: string | null }) {
    return prisma.courseAttachment.create({
      data: {
        ...data,
        courseId
      }
    });
  }


  static async deleteAttachment(id: string) {
    return prisma.courseAttachment.delete({
      where: { id }
    });
  }

  static async getAttachmentById(id: string) {
    return prisma.courseAttachment.findUnique({
      where: { id }
    });
  }

  static async verifyAttendance(moduleId: string, userId: string, passcode: string) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId }
    });

    if (!module || module.type !== 'LIVE_SESSION') {
      throw new Error('Module not found or is not a live session');
    }

    if (!module.attendanceCode) {
      throw new Error('Attendance code not configured for this session');
    }

    if (module.attendanceCode.trim().toLowerCase() !== passcode.trim().toLowerCase()) {
      throw new Error('Incorrect passcode. Please ensure you attended the session to receive the code.');
    }

    // Mark as completed using the centralized progress service
    return EnrollmentsService.completeModule(userId, moduleId);
  }


}





