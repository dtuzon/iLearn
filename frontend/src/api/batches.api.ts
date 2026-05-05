import apiClient from './client';

export interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  courseId?: string;
  learningPathId?: string;
  course?: { title: string };
  learningPath?: { title: string };
  courseSchedules?: any[];
  activityCheckers?: any[];
  enrollments?: any[];
  learningPathEnrollments?: any[];
  _count?: {
    enrollments: number;
    learningPathEnrollments: number;
  };
}

export const batchesApi = {
  getAll: async () => {
    const response = await apiClient.get('/batches');
    return response.data as Batch[];
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/batches/${id}`);
    return response.data as Batch;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/batches', data);
    return response.data as Batch;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/batches/${id}`, data);
    return response.data as Batch;
  },

  assignLearners: async (id: string, userIds: string[]) => {
    await apiClient.post(`/batches/${id}/assign-learners`, { userIds });
  },

  delete: async (id: string) => {
    await apiClient.delete(`/batches/${id}`);
  }
};
