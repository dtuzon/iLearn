import { prisma } from '../../lib/prisma';
import { CourseStatus, EnrollmentStatus } from '@prisma/client';

export class CatalogService {
  static async getCatalog(query: {
    search?: string;
    type?: 'all' | 'courses' | 'paths';
    sort?: 'newest' | 'alphabetical' | 'popular';
    category?: string;
    userId?: string;
  }) {
    const { search, type, sort, category, userId } = query;

    const userCourseEnrollments = userId
      ? await prisma.enrollment.findMany({ where: { userId } })
      : [];

    let courses: any[] = [];
    let paths: any[] = [];

    // Fetch Courses
    if (type === 'all' || type === 'courses') {
      courses = await prisma.course.findMany({
        where: {
          status: CourseStatus.PUBLISHED,
          isLatest: true,
          AND: [
            search ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
              ]
            } : {},
            category && category !== 'ALL' ? {
              targetDepartments: { has: category }
            } : {}
          ]
        },
        include: {
          _count: { select: { enrollments: true } },
          ...(userId ? {
            enrollments: {
              where: { userId }
            }
          } : {})
        }
      });
    }

    // Fetch Paths
    if (type === 'all' || type === 'paths') {
      paths = await prisma.learningPath.findMany({
        where: {
          status: CourseStatus.PUBLISHED,
          AND: [
            search ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
              ]
            } : {},
            category && category !== 'ALL' ? {
              targetDepartments: { has: category }
            } : {}
          ]
        },
        include: {
          _count: { select: { enrollments: true } },
          pathCourses: { include: { course: true } },
          ...(userId ? {
            enrollments: {
              where: { userId }
            }
          } : {})
        }
      });
    }

    // Map to a unified format
    const unifiedCatalog = [
      ...courses.map(c => ({ 
        ...c, 
        contentType: 'COURSE',
        isEnrolled: userId ? (c.enrollments && c.enrollments.length > 0) : false,
        enrollmentStatus: userId ? (c.enrollments?.[0]?.status || null) : null
      })),
      ...paths.map(p => {
        const lpEnrollment = p.enrollments?.[0];
        let status = lpEnrollment?.status || null;

        if (userId && lpEnrollment) {
          const courseIds = p.pathCourses.map((pc: any) => pc.courseId);
          if (courseIds.length > 0) {
            const completedCount = userCourseEnrollments.filter(
              e => courseIds.includes(e.courseId) && e.status === EnrollmentStatus.COMPLETED
            ).length;
            
            let calculatedStatus: EnrollmentStatus = EnrollmentStatus.IN_PROGRESS;
            if (completedCount === courseIds.length) {
              calculatedStatus = EnrollmentStatus.COMPLETED;
            } else if (completedCount > 0 || userCourseEnrollments.some(e => courseIds.includes(e.courseId) && (e.status === EnrollmentStatus.IN_PROGRESS || e.currentModuleOrder > 0))) {
              calculatedStatus = EnrollmentStatus.IN_PROGRESS;
            } else {
              calculatedStatus = EnrollmentStatus.NOT_STARTED;
            }

            if (status !== calculatedStatus) {
              status = calculatedStatus;
              // Self-heal: correct the out-of-sync status in the database asynchronously
              prisma.learningPathEnrollment.update({
                where: { id: lpEnrollment.id },
                data: { 
                  status: calculatedStatus,
                  ...(calculatedStatus === EnrollmentStatus.COMPLETED ? { completedAt: new Date() } : { completedAt: null })
                }
              }).catch(err => console.error('Failed to self-heal learning path enrollment status:', err));
            }
          }
        }

        return {
          ...p,
          contentType: 'PATH',
          isEnrolled: userId ? (p.enrollments && p.enrollments.length > 0) : false,
          enrollmentStatus: status
        };
      })
    ];

    // Sorting
    if (sort === 'alphabetical') {
      unifiedCatalog.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'popular') {
      unifiedCatalog.sort((a, b) => (b._count.enrollments || 0) - (a._count.enrollments || 0));
    } else {
      // newest
      unifiedCatalog.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return unifiedCatalog;
  }
}
