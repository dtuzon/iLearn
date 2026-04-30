import apiClient from './client';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  passingGrade: number;
  targetAudience: string;
  targetDepartments: string[];
  requires180DayEval: boolean;
  lecturerId: string;
  createdAt: string;
  updatedAt: string;
  lecturer?: { firstName: string | null; lastName: string | null };
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
}

export const coursesApi = {
  getAll: async () => {
    const response = await apiClient.get('/courses');
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
  }
};
