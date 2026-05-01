import apiClient from './client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export const notificationsApi = {
  getAll: async () => {
    const response = await apiClient.get('/notifications');
    return response.data as Notification[];
  },
  markRead: async (id: string) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  }
};
