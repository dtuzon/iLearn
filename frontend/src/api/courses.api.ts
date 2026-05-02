import apiClient from './client';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean; // Keep for compatibility if needed, but we should use status
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED' | 'RETIRED';

  version: number;
  parentId: string | null;
  isLatest: boolean;
  passingGrade: number;


  targetAudience: string;
  targetDepartments: string[];
  requires180DayEval: boolean;
  lecturerId: string;
  createdAt: string;
  updatedAt: string;
  lecturer?: { firstName: string | null; lastName: string | null };
  approvedBy?: { firstName: string | null; lastName: string | null };
  _count?: { modules: number };
  modules?: CourseModule[];
}



export interface CourseModule {
  id: string;
  title: string;
  type: 'PRE_QUIZ' | 'VIDEO' | 'WORKSHOP' | 'POST_QUIZ' | 'EVALUATION' | 'ONLINE_EVALUATION';
  sequenceOrder: number;
  contentUrlOrText: string | null;
  durationSeconds: number | null;
  facilitators?: string[];
  courseId: string;
  activityInstructions?: string;
  activityTemplateUrl?: string;
  checkerType?: 'IMMEDIATE_SUPERIOR' | 'COURSE_CREATOR' | 'SPECIFIC_USER';
  specificCheckerId?: string;
  evaluationTemplateId?: string;
}



export const coursesApi = {
  getAll: async (tab: string = 'active') => {
    const response = await apiClient.get(`/courses?tab=${tab}`);
    return response.data as Course[];
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data as Course;
  },
  create: async (data: { title: string; description?: string; passingGrade: number; targetAudience: string }) => {
    const response = await apiClient.post('/courses', data);
    return response.data as Course;
  },
  addModule: async (courseId: string, data: { title: string; type: string; sequenceOrder: number; facilitators?: string[] }) => {
    const response = await apiClient.post(`/courses/${courseId}/modules`, data);
    return response.data as CourseModule;
  },
  updateModule: async (courseId: string, moduleId: string, data: Partial<CourseModule>) => {
    const response = await apiClient.patch(`/courses/${courseId}/modules/${moduleId}`, data);
    return response.data as CourseModule;
  },
  deleteModule: async (courseId: string, moduleId: string) => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
  },
  updateCertificateTemplate: async (courseId: string, formData: FormData) => {
    const response = await apiClient.put(`/courses/${courseId}/certificate-template`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  partialUpdate: async (courseId: string, data: Partial<Course>) => {
    const response = await apiClient.patch(`/courses/${courseId}`, data);
    return response.data as Course;
  },
  updateStatus: async (courseId: string, status: string) => {
    const response = await apiClient.patch(`/courses/${courseId}/status`, { status });
    return response.data;
  },
  createDraftVersion: async (courseId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/create-draft-version`);
    return response.data as Course;
  },
  getVersions: async (parentId: string) => {
    const response = await apiClient.get(`/courses/${parentId}/versions`);
    return response.data as Course[];
  },
  restoreVersion: async (versionId: string) => {
    const response = await apiClient.post(`/courses/${versionId}/restore-version`);
    return response.data as Course;
  },
  unretire: async (courseId: string) => {
    const response = await apiClient.put(`/courses/${courseId}/unretire`);
    return response.data as Course;
  }
};



