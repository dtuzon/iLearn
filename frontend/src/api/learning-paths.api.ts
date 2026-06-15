import apiClient from './client';
import type { Course } from './courses.api';

export interface CertificateTemplate {
  id: string;
  backgroundImageUrl: string | null;
  designConfig: any; // We can keep designConfig as any since it is a JSON object with arbitrary keys
  learningPathId?: string | null;
  courseId?: string | null;
}

export interface LearningPathCourse {
  id: string;
  learningPathId: string;
  courseId: string;
  order: number;
  course: Course;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  targetAudience: string | null;
  targetDepartments: string[];
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED' | 'RETIRED';
  version: number;
  versionTag: string | null;
  changeSummary: string | null;
  parentId: string | null;
  isLatest: boolean;
  hasCertificate: boolean;
  createdAt: string;
  updatedAt: string;
  pathCourses: LearningPathCourse[];
  certificateTemplate?: CertificateTemplate;
}

export interface LearningPathEnrollment {
  id: string;
  userId: string;
  learningPathId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  enrolledAt: string;
  completedAt: string | null;
  dueDate: string | null;
  learningPath: LearningPath & {
    certificates?: { id: string; userId: string; issuedAt: string }[];
  };
  batch?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
}

export const learningPathsApi = {
  getAll: async (): Promise<LearningPath[]> => {
    const response = await apiClient.get('/learning-paths');
    return response.data;
  },

  getById: async (id: string): Promise<LearningPath> => {
    const response = await apiClient.get(`/learning-paths/${id}`);
    return response.data;
  },

  create: async (data: Partial<LearningPath>): Promise<LearningPath> => {
    const response = await apiClient.post('/learning-paths', data);
    return response.data;
  },

  update: async (id: string, data: Partial<LearningPath>): Promise<LearningPath> => {
    const response = await apiClient.put(`/learning-paths/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/learning-paths/${id}`);
  },

  syncCourses: async (id: string, courses: { courseId: string; order: number }[]): Promise<LearningPath> => {
    const response = await apiClient.put(`/learning-paths/${id}/courses`, { courses });
    return response.data;
  },
  
  enroll: async (id: string, userId?: string, dueDate?: Date): Promise<LearningPathEnrollment> => {
    const response = await apiClient.post(`/learning-paths/${id}/enroll`, { userId, dueDate });
    return response.data;
  },

  getUserEnrollments: async (userId: string): Promise<LearningPathEnrollment[]> => {
    const response = await apiClient.get(`/users/${userId}/learning-paths`);
    return response.data;
  },

  updateCertificateTemplate: async (id: string, formData: FormData): Promise<CertificateTemplate> => {
    const response = await apiClient.put(`/learning-paths/${id}/certificate-template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateStatus: async (id: string, status: string, versionTag?: string, changeSummary?: string): Promise<LearningPath> => {
    const response = await apiClient.patch(`/learning-paths/${id}/status`, { status, versionTag, changeSummary });
    return response.data;
  },

  uploadThumbnail: async (id: string, file: File): Promise<{ thumbnailUrl: string }> => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const response = await apiClient.post(`/learning-paths/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getVersions: async (id: string): Promise<LearningPath[]> => {
    const response = await apiClient.get(`/learning-paths/${id}/versions`);
    return response.data;
  },

  createVersion: async (id: string): Promise<LearningPath> => {
    const response = await apiClient.post(`/learning-paths/${id}/versions`);
    return response.data;
  },

  discardDraft: async (id: string): Promise<void> => {
    await apiClient.delete(`/learning-paths/${id}/discard-draft`);
  }
};



