import apiClient from './client';
import type { Course } from './courses.api';

export interface Enrollment {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_GRADING' | 'COMPLETED';
  currentModuleOrder: number;
  enrolledAt: string;
  course: Course & { _count: { modules: number } };
  user?: {
    activitySubmissions: any[];
  };
}


export const enrollmentsApi = {
  getMyCourses: async () => {
    const response = await apiClient.get('/enrollments/my-courses');
    return response.data as Enrollment[];
  },
  getProgress: async (courseId: string) => {
    const response = await apiClient.get(`/enrollments/${courseId}/progress`);
    return response.data;
  },
  completeModule: async (moduleId: string) => {
    const response = await apiClient.post(`/enrollments/complete-module/${moduleId}`);
    return response.data;
  },
  enroll: async (courseId: string) => {
    const response = await apiClient.post(`/enrollments/${courseId}`);
    return response.data;
  }
};
