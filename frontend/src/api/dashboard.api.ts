import apiClient from './client';

export const dashboardApi = {
  getMetrics: async () => {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  }
};
