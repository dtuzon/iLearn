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
  immediateSuperiorId: string | null;
  immediateSuperior?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export const usersApi = {
  getAll: async (filters: { search?: string, role?: string, departmentId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);

    const response = await apiClient.get(`/users?${params.toString()}`);
    return response.data as UserResponse[];
  },
  bulkUpdate: async (userIds: string[], data: { action: string, role?: string, departmentId?: string }) => {
    const response = await apiClient.patch('/users/bulk-update', { userIds, ...data });
    return response.data;
  },
  create: async (data: Partial<UserResponse> & { password?: string }) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  update: async (id: string, data: Partial<UserResponse>) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },
  getMyTeam: async () => {
    const response = await apiClient.get('/users/my-team');
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
