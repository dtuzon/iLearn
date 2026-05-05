import apiClient from './client';

export interface ActivitySubmission {
  id: string;
  moduleId: string;
  userId: string;
  batchId: string;
  fileUrl?: string;
  textResponse?: string;
  status: 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
  module: {
    title: string;
    type: string;
    course?: { title: string };
  };
}

export const activitiesApi = {
  submit: async (data: { moduleId: string; fileUrl?: string; textResponse?: string }) => {
    const response = await apiClient.post('/activities/submit', data);
    return response.data;
  },

  getCheckableBatches: async () => {
    const response = await apiClient.get('/activities/checkable-batches');
    return response.data;
  },

  getBatchSubmissions: async (batchId: string) => {
    const response = await apiClient.get(`/activities/batch-submissions/${batchId}`);
    return response.data as ActivitySubmission[];
  },

  grade: async (id: string, data: { status: string; score?: number; feedback?: string }) => {
    const response = await apiClient.patch(`/activities/submissions/${id}/grade`, data);
    return response.data;
  }
};
