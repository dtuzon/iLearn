import apiClient from './client';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ActivitySubmission {
  id: string;
  moduleId: string;
  userId: string;
  fileUrl: string | null;
  textResponse: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    username: string;
  };
  module?: {
    title: string;
    course: {
      title: string;
    };
  };
}

export const workshopsApi = {
  submit: async (moduleId: string, data: FormData) => {
    const response = await apiClient.post(`/workshops/${moduleId}/submit`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data as ActivitySubmission;
  },
  getMySubmission: async (moduleId: string) => {
    const response = await apiClient.get(`/workshops/${moduleId}/my-submission`);
    return response.data as ActivitySubmission | null;
  },
  getPending: async () => {
    const response = await apiClient.get('/workshops/pending');
    return response.data as ActivitySubmission[];
  },
  review: async (submissionId: string, data: { status: SubmissionStatus; feedback?: string }) => {
    const response = await apiClient.post(`/workshops/${submissionId}/review`, data);
    return response.data as ActivitySubmission;
  }
};
