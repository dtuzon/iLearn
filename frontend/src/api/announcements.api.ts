import apiClient from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  expiresAt?: string;
  priority: string;
  authorId: string;
  createdAt: string;
  author?: { firstName: string | null; lastName: string | null };
}

export const announcementsApi = {
  getAll: async () => {
    const response = await apiClient.get('/announcements');
    return response.data as Announcement[];
  },
  create: async (data: Partial<Announcement>) => {
    const response = await apiClient.post('/announcements', data);
    return response.data as Announcement;
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/announcements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data as { imageUrl: string };
  },
  delete: async (id: string) => {
    await apiClient.delete(`/announcements/${id}`);
  }
};
