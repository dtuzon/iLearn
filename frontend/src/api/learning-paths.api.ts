import apiClient from './client';

export type LearningPathCourse = {
  id: string;
  learningPathId: string;
  courseId: string;
  order: number;
  course: any;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string | null;
  targetAudience: string | null;
  targetDepartments: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  pathCourses: LearningPathCourse[];
};

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
  
  enroll: async (id: string, userId?: string): Promise<any> => {
    const response = await apiClient.post(`/learning-paths/${id}/enroll`, { userId });
    return response.data;
  },

  getUserEnrollments: async (userId: string): Promise<any[]> => {
    const response = await apiClient.get(`/users/${userId}/learning-paths`);
    return response.data;
  }
};

