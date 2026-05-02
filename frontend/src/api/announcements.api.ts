import apiClient from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  expiresAt?: string;
  priority: 'HIGH' | 'NORMAL';
  createdAt: string;
  author: { firstName: string | null; lastName: string | null };
}

export const announcementsApi = {
  getAll: async () => {
    const response = await apiClient.get('/announcements');
    return response.data as Announcement[];
  },
  create: async (data: { title: string; content: string; priority: string; imageUrl?: string; expiresAt?: string }) => {
    const response = await apiClient.post('/announcements', data);
    return response.data as Announcement;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/announcements/${id}`);
  }
};
