import apiClient from './client';
import type { Course } from './courses.api';
import type { ActivitySubmission } from './activities.api';

export interface Enrollment {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_GRADING' | 'COMPLETED';
  currentModuleOrder: number;
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  dueDate?: string;
  course: Course & { _count: { modules: number } };
  user?: {
    activitySubmissions: ActivitySubmission[];
  };
  batch?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
}


export const enrollmentsApi = {
  getMyCourses: async (): Promise<Enrollment[]> => {
    const response = await apiClient.get('/enrollments/my-courses');
    return response.data;
  },
  getProgress: async (courseId: string): Promise<{ progress: number; currentModuleOrder: number; status: string }> => {
    const response = await apiClient.get(`/enrollments/${courseId}/progress`);
    return response.data;
  },
  completeModule: async (moduleId: string): Promise<{ id: string; status: string; progress: number }> => {
    const response = await apiClient.post(`/enrollments/complete-module/${moduleId}`);
    return response.data;
  },
  enroll: async (courseId: string, userId?: string, dueDate?: Date): Promise<Enrollment> => {
    const response = await apiClient.post(`/enrollments/${courseId}`, { userId, dueDate });
    return response.data;
  },
  advanceProgress: async (courseId: string): Promise<{ id: string; status: string }> => {
    const response = await apiClient.post(`/enrollments/${courseId}/advance-progress`);
    return response.data;
  },
  bulkEnroll: async (data: { contentType: 'COURSE' | 'PATH', contentId: string, targetUserIds: string[], dueDate?: Date }): Promise<{ message: string; enrolledCount: number }> => {
    const response = await apiClient.post('/enrollments/bulk', data);
    return response.data;
  }
};



