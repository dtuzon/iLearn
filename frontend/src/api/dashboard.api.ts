import apiClient from './client';

export interface DashboardMetric {
  label: string;
  value: string;
  growth: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  systemStatus?: {
    smtpConfigured: boolean;
    zoomConfigured: boolean;
    databaseConnected: boolean;
  };
  activityChart?: Array<{
    date: string;
    logins: number;
    actions: number;
  }>;
}

export const dashboardApi = {
  getMetrics: async () => {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data as DashboardData;
  }
};
