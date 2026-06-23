import { prisma } from '../../lib/prisma';
import { Role, CourseStatus, EnrollmentStatus } from '@prisma/client';
import { EnrollmentsService } from '../enrollments/enrollments.service';




export class CoursesService {
  static async getAll(userId: string, role: string, tab: string = 'active') {
    const isRetired = tab === 'retired';
    const isPending = tab === 'pending';

    if (role === Role.EMPLOYEE) {
      // Employees: Show latest active published courses or enrolled ones (excluding retired unless completed)
      return prisma.course.findMany({
        where: {
          isLatest: true,
          OR: [
            { status: CourseStatus.PUBLISHED },
            { 
              AND: [
                { status: CourseStatus.RETIRED },
                { enrollments: { some: { userId, status: EnrollmentStatus.COMPLETED } } }
              ]
            },
            { 
              AND: [
                { status: CourseStatus.PUBLISHED },
                { enrollments: { some: { userId } } }
              ]
            }
          ]
        },
        include: {
          lecturer: { select: { firstName: true, lastName: true } },
          _count: { select: { modules: true } }
        }
      });
    }

    // Determine status filter for each tab
    let statusFilter: any;
    if (isRetired) {
      statusFilter = CourseStatus.RETIRED;
    } else if (isPending) {
      statusFilter = CourseStatus.PENDING_APPROVAL;
    } else {
      // Active tab: exclude RETIRED and PENDING_APPROVAL (they live in their own tabs)
      statusFilter = { notIn: [CourseStatus.RETIRED, CourseStatus.PENDING_APPROVAL] };
    }

    const baseWhere: any = { status: statusFilter };

    if (role === Role.COURSE_CREATOR) {
      baseWhere.lecturerId = userId;
    }

    const courses = await prisma.course.findMany({
      where: {
        ...baseWhere,
        ...(isPending ? {} : {
          OR: [
            { isLatest: true },
            { status: CourseStatus.DRAFT, parentId: { not: null } }
          ]
        })
      },
      include: {
        lecturer: { select: { firstName: true, lastName: true } },
        _count: { select: { modules: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // For the pending tab: no deduplication needed — show all individual pending records
    if (isPending) return courses;

    // Post-process to deduplicate lineage for the active/retired tabs
    // Priority: DRAFT > PENDING_APPROVAL > PUBLISHED > ARCHIVED
    const statusPriority: Record<string, number> = {
      DRAFT: 3,
      PENDING_APPROVAL: 2,
      PUBLISHED: 1,
      ARCHIVED: 0,
      RETIRED: 0
    };

    const lineageMap = new Map();
    courses.forEach(course => {
      const lineageId = course.parentId || course.id;
      const existing = lineageMap.get(lineageId);
      const currentPriority = statusPriority[course.status] ?? 0;
      const existingPriority = existing ? (statusPriority[existing.status] ?? 0) : -1;

      if (!existing || currentPriority > existingPriority) {
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
    const allowed = {
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl,
      versionTag: data.versionTag,
      introContent: data.introContent,
      closingContent: data.closingContent,
      passingGrade: typeof data.passingGrade === 'number' ? data.passingGrade : undefined,
      targetAudience: data.targetAudience,
      targetDepartments: data.targetDepartments,
      hasCertificate: data.hasCertificate,
      evaluationFormId: data.evaluationFormId,
      isLatest: true,
      version: 1
    };
    return prisma.course.create({
      data: {
        ...allowed,
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

    const allowed = {
      title: data.title,
      type: data.type,
      contentUrlOrText: data.contentUrlOrText,
      durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : undefined,
      shuffleQuestions: data.shuffleQuestions,
      shuffleOptions: data.shuffleOptions,
      activityInstructions: data.activityInstructions,
      activityTemplateUrl: data.activityTemplateUrl,
      checkerType: data.checkerType,
      specificCheckerId: data.specificCheckerId,
      meetingUrl: data.meetingUrl,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      attendanceCode: data.attendanceCode,
      evaluationTemplateId: data.evaluationTemplateId,
    };

    return prisma.courseModule.create({
      data: {
        ...allowed,
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
    const allowed: any = {};
    const allowedKeys = [
      'title', 'description', 'thumbnailUrl', 'versionTag', 'changeSummary',
      'introContent', 'closingContent', 'passingGrade', 'targetAudience',
      'targetDepartments', 'hasCertificate', 'evaluationFormId'
    ];
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        allowed[key] = data[key];
      }
    }
    return prisma.course.update({
      where: { id },
      data: allowed
    });
  }

  static async updateModule(id: string, data: any) {
    const allowed: any = {};
    const allowedKeys = [
      'title', 'type', 'contentUrlOrText', 'durationSeconds', 'shuffleQuestions',
      'shuffleOptions', 'activityInstructions', 'activityTemplateUrl', 'checkerType',
      'specificCheckerId', 'meetingUrl', 'scheduledAt', 'attendanceCode',
      'evaluationTemplateId'
    ];
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        if (key === 'scheduledAt') {
          allowed[key] = data[key] ? new Date(data[key]) : null;
        } else {
          allowed[key] = data[key];
        }
      }
    }
    return prisma.courseModule.update({
      where: { id },
      data: allowed
    });
  }

  static async deleteModule(id: string) {
    return prisma.courseModule.delete({
      where: { id }
    });
  }

  static async updateStatus(id: string, status: CourseStatus, approverId?: string, force?: boolean) {
    // Guard: Prevent unpublishing a course that has IN_PROGRESS learners
    if (status === CourseStatus.DRAFT) {
      const course = await prisma.course.findUnique({ where: { id } });
      if (course?.status === CourseStatus.PUBLISHED) {
        const activeCount = await prisma.enrollment.count({
          where: {
            courseId: id,
            status: 'IN_PROGRESS'
          }
        });
        if (activeCount > 0) {
          if (force) {
            // Delete active enrollments (Force unenrollment)
            await prisma.enrollment.deleteMany({
              where: {
                courseId: id,
                status: 'IN_PROGRESS'
              }
            });
            console.log(`🗑️ Force deleted ${activeCount} active enrollments to unpublish course ${id}`);
          } else {
            throw new Error(
              `Cannot unpublish. There are ${activeCount} active learner(s) currently enrolled in this version. ` +
              `Please use 'Create New Draft Version' instead to preserve historical tracking.`
            );
          }
        }
      }
    }

    if (status === CourseStatus.PUBLISHED) {
      return this.publishCourse(id, approverId);
    }

    return prisma.course.update({
      where: { id },
      data: { status }
    });
  }

  static async getActiveLearners(courseId: string) {
    return prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'IN_PROGRESS'
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
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
          hasCertificate: original.hasCertificate,
          lecturerId: original.lecturerId,
          evaluationFormId: original.evaluationFormId,
          status: CourseStatus.DRAFT,
          version: original.version + 1,
          versionTag: null, // Creator will label this version in the studio
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
    // Strip any internal workflow suffix: (Draft), (Restored v2), (Draft v3), etc.
    const cleanTitle = current.title.replace(/\s*\([^)]*\)\s*$/i, '').trim();

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

      // 3. Publish current draft with a clean title
      return tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.PUBLISHED,
          isLatest: true,
          approvedById: approverId,
          title: cleanTitle
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
        approvedBy: { select: { firstName: true, lastName: true } },
        modules: {
          select: {
            title: true,
            type: true,
            sequenceOrder: true
          },
          orderBy: { sequenceOrder: 'asc' }
        },
        _count: {
          select: { modules: true }
        }
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
    // Strip any existing internal suffix from the archived title for a clean draft name
    const baseTitle = versionToRestore.title.replace(/\s*\([^)]*\)\s*$/i, '').trim();

    return prisma.$transaction(async (tx) => {
      return tx.course.create({
        data: {
          title: baseTitle,
          description: versionToRestore.description,
          thumbnailUrl: versionToRestore.thumbnailUrl,
          passingGrade: versionToRestore.passingGrade,
          targetAudience: versionToRestore.targetAudience,
          targetDepartments: versionToRestore.targetDepartments,
          hasCertificate: versionToRestore.hasCertificate,
          lecturerId: versionToRestore.lecturerId,
          evaluationFormId: versionToRestore.evaluationFormId,
          status: CourseStatus.DRAFT,
          version: newVersionNum,
          versionTag: null, // Creator will label this restored version in the studio
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

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: module.courseId
        }
      }
    });

    let expectedCodes: string[] = [];
    if (module.attendanceCode) {
      expectedCodes.push(module.attendanceCode.trim().toLowerCase());
    }

    if (enrollment?.batchId) {
      const liveSession = await prisma.batchLiveSession.findUnique({
        where: {
          batchId_courseModuleId: {
            batchId: enrollment.batchId,
            courseModuleId: moduleId
          }
        }
      });
      if (liveSession?.zoomPasscode) {
        expectedCodes.push(liveSession.zoomPasscode.trim().toLowerCase());
      }
    }

    if (expectedCodes.length === 0) {
      throw new Error('Attendance code not configured for this session');
    }

    const inputCode = passcode.trim().toLowerCase();
    if (!expectedCodes.includes(inputCode)) {
      throw new Error('Incorrect passcode. Please ensure you attended the session to receive the code.');
    }

    // Mark as completed using the centralized progress service
    return EnrollmentsService.completeModule(userId, moduleId);
  }

  static async discardDraft(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!course) throw new Error('Course not found');

    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.PENDING_APPROVAL) {
      throw new Error('Only drafts or pending versions can be discarded.');
    }

    // Safety check: if it somehow has active enrollments, don't delete
    if (course._count.enrollments > 0) {
       // This shouldn't happen for drafts unless someone was enrolled in a draft version manually
       throw new Error('Cannot discard a version that has active enrollments.');
    }

    return prisma.$transaction(async (tx) => {
      // Find the most recent previous version in the lineage
      const parentId = course.parentId || course.id;
      const previousVersion = await tx.course.findFirst({
        where: {
          OR: [
            { id: parentId },
            { parentId: parentId }
          ],
          id: { not: id } // Exclude the draft we are discarding
        },
        orderBy: { version: 'desc' }
      });

      if (previousVersion) {
        // Revert the previous version to be the latest published course
        await tx.course.update({
          where: { id: previousVersion.id },
          data: {
            isLatest: true,
            status: CourseStatus.PUBLISHED
          }
        });
        console.log(`🔄 Reverted course "${previousVersion.title}" (v${previousVersion.version}) back to PUBLISHED and isLatest: true`);
      }

      // Now safely delete the draft
      return tx.course.delete({
        where: { id }
      });
    });
  }

}





