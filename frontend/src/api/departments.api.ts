import apiClient from './client';

export interface Department {
  id: string;
  name: string;
  headUserId?: string | null;
  createdAt: string;
}

export const departmentsApi = {
  getAll: async () => {
    const response = await apiClient.get('/departments');
    return response.data as Department[];
  },
  create: async (name: string) => {
    const response = await apiClient.post('/departments', { name });
    return response.data;
  },
  update: async (id: string, data: Partial<Department>) => {
    const response = await apiClient.put(`/departments/${id}`, data);
    return response.data;
  },
};
