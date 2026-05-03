import { prisma } from '../../lib/prisma';
import { CourseStatus } from '@prisma/client';

export class CatalogService {
  static async getCatalog(query: {
    search?: string;
    type?: 'all' | 'courses' | 'paths';
    sort?: 'newest' | 'alphabetical' | 'popular';
    category?: string;
  }) {
    const { search, type, sort, category } = query;

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
          _count: { select: { enrollments: true } }
        }
      });
    }

    // Fetch Paths
    if (type === 'all' || type === 'paths') {
      paths = await prisma.learningPath.findMany({
        where: {
          isPublished: true,
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
          pathCourses: { include: { course: true } }
        }
      });
    }

    // Map to a unified format
    const unifiedCatalog = [
      ...courses.map(c => ({ ...c, contentType: 'COURSE' })),
      ...paths.map(p => ({ ...p, contentType: 'PATH' }))
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
