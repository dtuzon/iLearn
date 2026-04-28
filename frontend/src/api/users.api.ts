import apiClient from './client';

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export const usersApi = {
  getAll: async () => {
    const response = await apiClient.get('/users');
    return response.data as UserResponse[];
  },
  create: async (data: Partial<UserResponse> & { password?: string }) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  bulkImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/users/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
