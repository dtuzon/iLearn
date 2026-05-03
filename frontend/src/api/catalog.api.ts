import apiClient from './client';

export interface CatalogItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  contentType: 'COURSE' | 'PATH';
  targetAudience?: string;
  targetDepartments: string[];
  createdAt: string;
  pathCourses?: any[];
  _count: {
    enrollments: number;
  };
}

export const catalogApi = {
  getDiscovery: async (params: { 
    search?: string; 
    type?: string; 
    sort?: string; 
    category?: string; 
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.type) query.append('type', params.type);
    if (params.sort) query.append('sort', params.sort);
    if (params.category) query.append('category', params.category);

    const response = await apiClient.get(`/catalog?${query.toString()}`);
    return response.data as CatalogItem[];
  }
};
