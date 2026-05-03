import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, Role } from '@prisma/client';
import { CertificatesService } from '../certificates/certificates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { sendEmail } from '../../lib/email';



export class EnrollmentsService {
  static async getMyEnrollments(userId: string) {
    return prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lecturer: { select: { firstName: true, lastName: true } },
            _count: { select: { modules: true } }
          }
        }
      }
    });
  }

  static async enroll(userId: string, courseId: string, dueDate?: Date) {
    return prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        dueDate: dueDate ? new Date(dueDate) : undefined
      }, // Update due date if re-enrolling/updating
      create: {
        userId,
        courseId,
        status: EnrollmentStatus.NOT_STARTED,
        currentModuleOrder: 0,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });
  }

  static async getProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      include: {
        moduleProgress: {
          include: { module: true }
        },
        user: {
          include: {
            activitySubmissions: {
              where: { module: { courseId } }
            }
          }
        }

      }
    });

    if (!enrollment) throw new Error('Enrollment not found');

    return enrollment;
  }

  static async completeModule(userId: string, moduleId: string) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });

    if (!module) throw new Error('Module not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: module.courseId
        }
      }
    });

    if (!enrollment) throw new Error('User not enrolled');

    // Mark module as completed
    await prisma.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId: enrollment.id,
          moduleId
        }
      },
      update: { completed: true, completedAt: new Date() },
      create: {
        enrollmentId: enrollment.id,
        moduleId,
        completed: true,
        completedAt: new Date()
      }
    });

    // Check if this was the current module and increment currentModuleOrder
    if (module.sequenceOrder === enrollment.currentModuleOrder) {
      const nextOrder = enrollment.currentModuleOrder + 1;
      
      // Check if there are more modules
      const totalModules = await prisma.courseModule.count({
        where: { courseId: module.courseId }
      });

      const isFinished = nextOrder >= totalModules;

        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            currentModuleOrder: nextOrder,
            status: isFinished ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
            completedAt: isFinished ? new Date() : undefined
          },
          include: { user: true, course: true }
        });

        // NEW: Learning Path Completion Logic
        if (isFinished) {
          await this.checkLearningPathCompletion(userId, module.courseId);
          // NEW: Strict Accountability Hook
          await this.notifyLeadershipOnLateCompletion(updatedEnrollment, 'COURSE');
        }
      }



    return { message: 'Module completed' };
  }

  static async submitOnlineEvaluation(userId: string, enrollmentId: string, data: { moduleId: string, comments?: string, facilitatorRatings: any[] }) {
    // 1. Save the evaluation result
    await prisma.onlineEvaluationResult.create({
      data: {
        userId,
        moduleId: data.moduleId,
        comments: data.comments,
        facilitatorRatings: data.facilitatorRatings
      }
    });

    // 2. Mark the module as complete
    return this.completeModule(userId, data.moduleId);
  }

  static async checkLearningPathCompletion(userId: string, completedCourseId: string) {
    // 1. Find all learning path enrollments for this user that include this course
    const pathEnrollments = await prisma.learningPathEnrollment.findMany({
      where: {
        userId,
        status: { not: EnrollmentStatus.COMPLETED }
      },
      include: {
        learningPath: {
          include: {
            pathCourses: true
          }
        }
      }
    });

    for (const pe of pathEnrollments) {
      // 2. Check if the completed course is part of this path
      const courseIdsInPath = pe.learningPath.pathCourses.map(pc => pc.courseId);
      if (courseIdsInPath.includes(completedCourseId)) {
        // 3. Check if all courses in this path are completed by the user
        const completedCount = await prisma.enrollment.count({
          where: {
            userId,
            courseId: { in: courseIdsInPath },
            status: EnrollmentStatus.COMPLETED
          }
        });

        if (completedCount === courseIdsInPath.length) {
          // 4. Mark Learning Path as completed
          const updatedPe = await prisma.learningPathEnrollment.update({
            where: { id: pe.id },
            data: {
              status: EnrollmentStatus.COMPLETED,
              completedAt: new Date()
            },
            include: { user: true, learningPath: true }
          });

          // NEW: Strict Accountability Hook
          await this.notifyLeadershipOnLateCompletion(updatedPe, 'PATH');


          // 5. Issue Certificate if enabled
          if (pe.learningPath.hasCertificate) {
            try {
              await CertificatesService.generateLearningPathCertificate(userId, pe.learningPathId);
              
              // 6. Notify user
              await prisma.notification.create({
                data: {
                  userId,
                  title: 'Macro-Credential Earned!',
                  message: `Congratulations! You have earned a completion certificate for the Learning Path: ${pe.learningPath.title}.`,
                  type: 'SUCCESS',
                  link: '/certificates'
                }
              });
            } catch (certError) {
              console.error('Failed to issue LP certificate:', certError);
            }
          }
        }

      }
    }
  }
  static async advanceProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { 
        course: { 
          include: { 
            _count: { select: { modules: true } } 
          } 
        } 
      }
    });

    if (!enrollment) throw new Error('Enrollment not found');

    const totalModules = enrollment.course._count.modules;
    const nextOrder = enrollment.currentModuleOrder + 1;
    
    // We allow progress to reach totalModules + 1 to account for the Closing page
    const isFinished = nextOrder > totalModules;

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        currentModuleOrder: nextOrder,
        status: isFinished ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
        completedAt: isFinished ? new Date() : undefined
      },
      include: { user: true, course: true }
    });

    if (isFinished) {
      await this.notifyLeadershipOnLateCompletion(updatedEnrollment, 'COURSE');
    }

    return updatedEnrollment;

  }

  }

  private static async notifyLeadershipOnLateCompletion(enrollment: any, type: 'COURSE' | 'PATH') {
    if (!enrollment.dueDate || !enrollment.completedAt) return;

    if (new Date(enrollment.completedAt) > new Date(enrollment.dueDate)) {
      try {
        const user = enrollment.user;
        const title = type === 'COURSE' ? enrollment.course.title : enrollment.learningPath.title;
        const employeeName = `${user.firstName} ${user.lastName}`;

        // 1. Fetch Supervisor
        const supervisor = await prisma.user.findUnique({
          where: { id: user.immediateSuperiorId || '' }
        });

        // 2. Fetch Learning Managers
        const learningManagers = await prisma.user.findMany({
          where: { role: Role.LEARNING_MANAGER, isActive: true }
        });

        const notifyIds = new Set<string>();
        if (supervisor) notifyIds.add(supervisor.id);
        learningManagers.forEach(lm => notifyIds.add(lm.id));

        const message = `Late Completion: ${employeeName} just completed ${title} after the deadline.`;

        for (const targetId of notifyIds) {
          // In-app Notification
          await NotificationsService.createNotification({
            userId: targetId,
            title: 'Strict Accountability: Late Completion',
            message,
            type: 'WARNING',
            link: `/admin/user-management?search=${user.username}`
          });

          // Email Notification
          const targetUser = (targetId === supervisor?.id) ? supervisor : learningManagers.find(lm => lm.id === targetId);
          if (targetUser?.email) {
            await sendEmail({
              to: targetUser.email,
              subject: `Strict Accountability Record: Late Completion - ${employeeName}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff5f5;">
                  <h2 style="color: #DC2626;">Late Assignment Completion</h2>
                  <p>Hello <strong>${targetUser.firstName}</strong>,</p>
                  <p>This is an automated accountability record. An employee under your supervision or management scope has completed an assignment after the target deadline.</p>
                  <hr style="border: none; border-top: 1px solid #fecaca; margin: 20px 0;" />
                  <p><strong>Employee:</strong> ${employeeName}</p>
                  <p><strong>Assignment:</strong> ${title}</p>
                  <p><strong>Deadline:</strong> ${new Date(enrollment.dueDate).toLocaleDateString()}</p>
                  <p><strong>Completion Date:</strong> ${new Date(enrollment.completedAt).toLocaleDateString()}</p>
                  <hr style="border: none; border-top: 1px solid #fecaca; margin: 20px 0;" />
                  <p>Please log in to the iLearn Portal to review this record and take appropriate action if necessary.</p>
                </div>
              `
            }).catch(e => console.error('Late completion email failed:', e));
          }
        }
      } catch (error) {
        console.error('Failed to process late completion notifications:', error);
      }
    }
  }

}



