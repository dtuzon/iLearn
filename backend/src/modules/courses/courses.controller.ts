import { Request, Response } from 'express';
import { CoursesService } from './courses.service';
import { StorageService } from '../../lib/services/storage.service';

import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';


export class CoursesController {
  // ... (previous methods stay the same)

  static async uploadThumbnail(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(id as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const thumbnailUrl = await StorageService.uploadFile(req.file, 'thumbnails');
      
      // Update course record
      await CoursesService.partialUpdate(id as string, { thumbnailUrl });

      res.json({ thumbnailUrl });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async uploadAttachment(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { moduleId } = req.body;
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(id as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const fileUrl = await StorageService.uploadFile(req.file, 'attachments');
      
      const attachment = await CoursesService.addAttachment(id as string, {
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        moduleId: moduleId || null
      });

      res.status(201).json(attachment);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteAttachment(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const attachment = await CoursesService.getAttachmentById(id as string);
      if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(attachment.courseId);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      // Delete from storage
      await StorageService.deleteFile(attachment.fileUrl);
      
      // Delete from DB
      await CoursesService.deleteAttachment(id as string);

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response) {

    try {
      const { tab } = req.query;
      const courses = await CoursesService.getAll(req.user!.userId, req.user!.role, tab as string);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await CoursesService.getById(id as string);
      res.json(course);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const course = await CoursesService.create(req.user!.userId, req.body);
      res.status(201).json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async addModule(req: AuthenticatedRequest, res: Response) {
    try {
      const { courseId } = req.params;
      
      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(courseId as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const module = await CoursesService.addModule(courseId as string, req.body);
      res.status(201).json(module);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }


  static async getModule(req: Request, res: Response) {
    try {
      const { moduleId } = req.params;
      const module = await CoursesService.getModule(moduleId as string);
      res.json(module);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async getModules(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const modules = await CoursesService.getModules(courseId as string);
      res.json(modules);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateCertificateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(id as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const designConfig = req.body.designConfig ? JSON.parse(req.body.designConfig) : undefined;
      let backgroundImageUrl = undefined;
      
      if (req.file) {
        backgroundImageUrl = await StorageService.uploadFile(req.file, 'certificates');
      }

      const template = await CoursesService.upsertCertificateTemplate(id as string, {
        backgroundImageUrl,
        designConfig
      });


      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }


  static async partialUpdate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(id as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const course = await CoursesService.partialUpdate(id as string, req.body);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }


  static async updateModule(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const moduleObj = await CoursesService.getModule(moduleId as string);
        if (moduleObj) {
          const course = await CoursesService.getById(moduleObj.courseId);
          if (!course || course.lecturerId !== req.user!.userId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
          }
        }
      }

      const module = await CoursesService.updateModule(moduleId as string, req.body);
      res.json(module);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteModule(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const moduleObj = await CoursesService.getModule(moduleId as string);
        if (moduleObj) {
          const course = await CoursesService.getById(moduleObj.courseId);
          if (!course || course.lecturerId !== req.user!.userId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
          }
        }
      }

      await CoursesService.deleteModule(moduleId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }


  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userRole = req.user!.role;

      // RBAC Logic for status transitions
      if (status === 'PUBLISHED' && userRole === Role.COURSE_CREATOR) {
        return res.status(403).json({ message: 'Only Learning Managers or Administrators can publish courses.' });
      }

      // Block Course Creator from retiring or unpublishing ANY course
      if (status === 'RETIRED' && userRole === Role.COURSE_CREATOR) {
        return res.status(403).json({ message: 'Only Learning Managers or Administrators can retire courses.' });
      }

      if (status === 'DRAFT' && userRole === Role.COURSE_CREATOR) {
        // Find if it was already published
        const currentCourse = await CoursesService.getById(id as string);
        if (currentCourse && currentCourse.status === 'PUBLISHED') {
          return res.status(403).json({ message: 'Only Learning Managers or Administrators can unpublish courses.' });
        }
      }


      // Ownership check
      if (userRole === Role.COURSE_CREATOR) {
        const currentCourse = await CoursesService.getById(id as string);
        if (!currentCourse || currentCourse.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }



      const course = await CoursesService.updateStatus(id as string, status, req.user!.userId);

      res.json(course);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getVersions(req: Request, res: Response) {

    try {
      const { parentId } = req.params;
      const versions = await CoursesService.getVersions(parentId as string);
      res.json(versions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async restoreVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Ownership check (IDOR protection)
      if (req.user!.role === Role.COURSE_CREATOR) {
        const versionToRestore = await CoursesService.getById(id as string);
        if (!versionToRestore || versionToRestore.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course lineage.' });
        }
      }

      const newDraft = await CoursesService.restoreVersion(id as string);
      res.status(201).json(newDraft);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }


  static async unretire(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await CoursesService.unretire(id as string);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async uploadVideo(req: Request, res: Response) {

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded' });
      }
      
      const videoUrl = `/uploads/videos/${req.file.filename}`;
      res.json({ url: videoUrl });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async createDraftVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Ownership check
      if (req.user!.role === Role.COURSE_CREATOR) {
        const course = await CoursesService.getById(id as string);
        if (!course || course.lecturerId !== req.user!.userId) {
          return res.status(403).json({ message: 'Forbidden: You do not own this course.' });
        }
      }

      const newDraft = await CoursesService.createDraftVersion(id as string);
      res.status(201).json(newDraft);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
  static async verifyAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      const { moduleId } = req.params;
      const { passcode } = req.body;
      const userId = req.user!.userId;

      await CoursesService.verifyAttendance(moduleId as string, userId, passcode);
      res.json({ message: 'Attendance verified and module marked as completed' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

}
