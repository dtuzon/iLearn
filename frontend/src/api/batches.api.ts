import apiClient from './client';

export interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  courseId?: string;
  learningPathId?: string;
  course?: { title: string };
  learningPath?: { title: string; pathCourses?: any[] };
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

  getAnalytics: async (id: string, filters?: { departmentId?: string; role?: string; status?: string }) => {
    let url = `/batches/${id}/analytics`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    const response = await apiClient.get(url);
    return response.data as {
      totalLearners: number;
      completionRate: number;
      averageScore: number;
      distribution: { name: string; value: number; fill: string }[];
      topPerformers: { name: string; averageScore: number }[];
      kashMetrics: { domain: string; score: number }[];
      knowledgeDelta: { preQuizAvg: number; postQuizAvg: number; percentageIncrease: number };
      learnerDetails: { id: string; name: string; department: string; role: string; status: string; enrolledAt: string; averageScore: number }[];
      moduleDetails: { id: string; title: string; type: string; completionRate: number; averageScore: number }[];
    };
  },

  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.patch(`/batches/${id}/cancel`, { reason });
    return response.data as { message: string; affectedLearners: number };
  },

  delete: async (id: string) => {
    await apiClient.delete(`/batches/${id}`);
  }
};
