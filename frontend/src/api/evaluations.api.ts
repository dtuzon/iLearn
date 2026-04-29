import apiClient from './client';

export interface FacilitatorRating {
  name: string;
  rating: number;
}

export interface OnlineEvaluationSubmission {
  moduleId: string;
  comments?: string;
  facilitatorRatings: FacilitatorRating[];
}

export const evaluationsApi = {
  submitOnlineEvaluation: async (enrollmentId: string, data: OnlineEvaluationSubmission) => {
    const response = await apiClient.post(`/enrollments/${enrollmentId}/online-evaluation`, data);
    return response.data;
  }
};
