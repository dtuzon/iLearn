import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

export class CalendarService {
  static async getCalendarEvents(userId: string, role: Role) {
    const isAdminOrManager = role === 'ADMINISTRATOR' || role === 'LEARNING_MANAGER';

    const events: any[] = [];

    if (isAdminOrManager) {
      // 1. Fetch ALL batch live sessions
      const liveSessions = await prisma.batchLiveSession.findMany({
        include: {
          batch: true,
          courseModule: {
            include: {
              course: true
            }
          }
        }
      });

      for (const s of liveSessions) {
        if (s.scheduledAt) {
          events.push({
            id: `live-${s.id}`,
            title: `[Live] ${s.topic}`,
            type: 'LIVE_SESSION',
            start: s.scheduledAt.toISOString(),
            end: new Date(s.scheduledAt.getTime() + 60 * 60 * 1000).toISOString(),
            extendedProps: {
              joinUrl: s.joinUrl,
              meetingId: s.zoomMeetingId,
              passcode: s.zoomPasscode,
              batchName: s.batch.name,
              courseTitle: s.courseModule.course.title
            }
          });
        }
      }

      // 2. Fetch ALL batches
      const batches = await prisma.batch.findMany({
        include: {
          course: true,
          learningPath: true
        }
      });

      for (const b of batches) {
        const targetTitle = b.course?.title || b.learningPath?.title || 'Cohort';
        events.push({
          id: `batch-${b.id}`,
          title: `[Batch] ${b.name} - ${targetTitle}`,
          type: 'BATCH_SCHEDULE',
          start: b.startDate.toISOString(),
          end: b.endDate.toISOString(),
          extendedProps: {
            batchName: b.name,
            targetTitle
          }
        });
      }

      // 3. Fetch ALL course schedules
      const courseSchedules = await prisma.batchCourseSchedule.findMany({
        include: {
          batch: true,
          course: true
        }
      });

      for (const cs of courseSchedules) {
        if (cs.startDate && cs.endDate) {
          events.push({
            id: `course-sched-${cs.id}`,
            title: `[Schedule] ${cs.course.title} (${cs.batch.name})`,
            type: 'COURSE_SCHEDULE',
            start: cs.startDate.toISOString(),
            end: cs.endDate.toISOString(),
            extendedProps: {
              batchName: cs.batch.name,
              courseTitle: cs.course.title
            }
          });
        }
      }

      // 4. Fetch ALL uncompleted enrollments with deadlines
      const enrollments = await prisma.enrollment.findMany({
        where: {
          status: { not: 'COMPLETED' },
          dueDate: { not: null }
        },
        include: {
          user: true,
          course: true
        }
      });

      for (const e of enrollments) {
        if (e.dueDate) {
          const learnerName = e.user.firstName && e.user.lastName 
            ? `${e.user.firstName} ${e.user.lastName}` 
            : e.user.username;
          events.push({
            id: `due-${e.id}`,
            title: `[Deadline] ${learnerName} - ${e.course.title}`,
            type: 'COURSE_DEADLINE',
            start: e.dueDate.toISOString(),
            end: e.dueDate.toISOString(),
            extendedProps: {
              learnerName,
              courseTitle: e.course.title
            }
          });
        }
      }

    } else {
      // Employees/Learners see ONLY what is assigned to them
      
      const myEnrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
          batch: {
            include: {
              liveSessions: {
                include: {
                  courseModule: {
                    include: {
                      course: true
                    }
                  }
                }
              },
              courseSchedules: {
                include: {
                  course: true
                }
              }
            }
          }
        }
      });

      const seenEventIds = new Set<string>();

      for (const e of myEnrollments) {
        if (e.dueDate) {
          events.push({
            id: `due-${e.id}`,
            title: `[Deadline] ${e.course.title}`,
            type: 'COURSE_DEADLINE',
            start: e.dueDate.toISOString(),
            end: e.dueDate.toISOString(),
            extendedProps: {
              courseTitle: e.course.title
            }
          });
        }

        const b = e.batch;
        if (b) {
          const batchEventId = `batch-${b.id}`;
          if (!seenEventIds.has(batchEventId)) {
            seenEventIds.add(batchEventId);
            events.push({
              id: batchEventId,
              title: `[Timeline] Batch: ${b.name}`,
              type: 'BATCH_SCHEDULE',
              start: b.startDate.toISOString(),
              end: b.endDate.toISOString(),
              extendedProps: {
                batchName: b.name
              }
            });
          }

          for (const s of b.liveSessions) {
            const liveEventId = `live-${s.id}`;
            if (s.scheduledAt && !seenEventIds.has(liveEventId)) {
              seenEventIds.add(liveEventId);
              events.push({
                id: liveEventId,
                title: `[Live] ${s.topic}`,
                type: 'LIVE_SESSION',
                start: s.scheduledAt.toISOString(),
                end: new Date(s.scheduledAt.getTime() + 60 * 60 * 1000).toISOString(),
                extendedProps: {
                  joinUrl: s.joinUrl,
                  meetingId: s.zoomMeetingId,
                  passcode: s.zoomPasscode,
                  courseTitle: s.courseModule.course.title
                }
              });
            }
          }

          for (const cs of b.courseSchedules) {
            const csEventId = `course-sched-${cs.id}`;
            if (cs.startDate && cs.endDate && !seenEventIds.has(csEventId)) {
              seenEventIds.add(csEventId);
              events.push({
                id: csEventId,
                title: `[Schedule] ${cs.course.title}`,
                type: 'COURSE_SCHEDULE',
                start: cs.startDate.toISOString(),
                end: cs.endDate.toISOString(),
                extendedProps: {
                  courseTitle: cs.course.title
                }
              });
            }
          }
        }
      }

      // Check Learning Path Enrollments
      const lpEnrollments = await prisma.learningPathEnrollment.findMany({
        where: { userId },
        include: {
          learningPath: true,
          batch: {
            include: {
              liveSessions: {
                include: {
                  courseModule: {
                    include: {
                      course: true
                    }
                  }
                }
              },
              courseSchedules: {
                include: {
                  course: true
                }
              }
            }
          }
        }
      });

      for (const lpe of lpEnrollments) {
        if (lpe.dueDate) {
          events.push({
            id: `lp-due-${lpe.id}`,
            title: `[Deadline] Learning Path: ${lpe.learningPath.title}`,
            type: 'COURSE_DEADLINE',
            start: lpe.dueDate.toISOString(),
            end: lpe.dueDate.toISOString(),
            extendedProps: {
              lpTitle: lpe.learningPath.title
            }
          });
        }

        const b = lpe.batch;
        if (b) {
          const batchEventId = `batch-${b.id}`;
          if (!seenEventIds.has(batchEventId)) {
            seenEventIds.add(batchEventId);
            events.push({
              id: batchEventId,
              title: `[Timeline] Batch: ${b.name}`,
              type: 'BATCH_SCHEDULE',
              start: b.startDate.toISOString(),
              end: b.endDate.toISOString(),
              extendedProps: {
                batchName: b.name
              }
            });
          }

          for (const s of b.liveSessions) {
            const liveEventId = `live-${s.id}`;
            if (s.scheduledAt && !seenEventIds.has(liveEventId)) {
              seenEventIds.add(liveEventId);
              events.push({
                id: liveEventId,
                title: `[Live] ${s.topic}`,
                type: 'LIVE_SESSION',
                start: s.scheduledAt.toISOString(),
                end: new Date(s.scheduledAt.getTime() + 60 * 60 * 1000).toISOString(),
                extendedProps: {
                  joinUrl: s.joinUrl,
                  meetingId: s.zoomMeetingId,
                  passcode: s.zoomPasscode,
                  courseTitle: s.courseModule.course.title
                }
              });
            }
          }

          for (const cs of b.courseSchedules) {
            const csEventId = `course-sched-${cs.id}`;
            if (cs.startDate && cs.endDate && !seenEventIds.has(csEventId)) {
              seenEventIds.add(csEventId);
              events.push({
                id: csEventId,
                title: `[Schedule] ${cs.course.title}`,
                type: 'COURSE_SCHEDULE',
                start: cs.startDate.toISOString(),
                end: cs.endDate.toISOString(),
                extendedProps: {
                  courseTitle: cs.course.title
                }
              });
            }
          }
        }
      }
    }

    return events;
  }
}
