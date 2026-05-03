import apiClient from './client';

export interface CourseAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  courseId: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  introContent: string | null;
  closingContent: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED' | 'RETIRED';
  version: number;
  parentId: string | null;
  isLatest: boolean;
  passingGrade: number;
  targetAudience: string;
  targetDepartments: string[];
  requires180DayEval: boolean;
  lecturerId: string;
  createdAt: string;
  updatedAt: string;
  lecturer?: { firstName: string | null; lastName: string | null };
  approvedBy?: { firstName: string | null; lastName: string | null };
  _count?: { modules: number };
  modules?: CourseModule[];
  attachments?: CourseAttachment[];
}

export interface CourseModule {
  id: string;
  title: string;
  type: 'PRE_QUIZ' | 'VIDEO' | 'WORKSHOP' | 'POST_QUIZ' | 'EVALUATION' | 'ONLINE_EVALUATION' | 'INTRODUCTION' | 'CLOSING' | 'LIVE_SESSION';

  sequenceOrder: number;
  contentUrlOrText: string | null;
  durationSeconds: number | null;
  facilitators?: string[];
  courseId: string;
  activityInstructions?: string;
  activityTemplateUrl?: string;
  checkerType?: 'IMMEDIATE_SUPERIOR' | 'COURSE_CREATOR' | 'SPECIFIC_USER';
  specificCheckerId?: string;
  evaluationTemplateId?: string;
  meetingUrl?: string;
  scheduledAt?: string;
  attendanceCode?: string;
  attachments?: CourseAttachment[];

}


export const coursesApi = {
  getAll: async (tab: string = 'active') => {
    const response = await apiClient.get(`/courses?tab=${tab}`);
    return response.data as Course[];
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data as Course;
  },
  getModule: async (moduleId: string) => {
    const response = await apiClient.get(`/courses/modules/${moduleId}`);
    return response.data as CourseModule;
  },

  create: async (data: { title: string; description?: string; passingGrade: number; targetAudience: string }) => {
    const response = await apiClient.post('/courses', data);
    return response.data as Course;
  },
  addModule: async (courseId: string, data: { title: string; type: string; sequenceOrder: number; facilitators?: string[] }) => {
    const response = await apiClient.post(`/courses/${courseId}/modules`, data);
    return response.data as CourseModule;
  },
  updateModule: async (courseId: string, moduleId: string, data: Partial<CourseModule>) => {
    const response = await apiClient.patch(`/courses/${courseId}/modules/${moduleId}`, data);
    return response.data as CourseModule;
  },
  deleteModule: async (courseId: string, moduleId: string) => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
  },
  updateCertificateTemplate: async (courseId: string, formData: FormData) => {
    const response = await apiClient.put(`/courses/${courseId}/certificate-template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  partialUpdate: async (courseId: string, data: Partial<Course>) => {
    const response = await apiClient.patch(`/courses/${courseId}`, data);
    return response.data as Course;
  },
  updateStatus: async (courseId: string, status: string) => {
    const response = await apiClient.patch(`/courses/${courseId}/status`, { status });
    return response.data;
  },
  createDraftVersion: async (courseId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/create-draft-version`);
    return response.data as Course;
  },
  getVersions: async (parentId: string) => {
    const response = await apiClient.get(`/courses/${parentId}/versions`);
    return response.data as Course[];
  },
  restoreVersion: async (versionId: string) => {
    const response = await apiClient.post(`/courses/${versionId}/restore-version`);
    return response.data as Course;
  },
  unretire: async (courseId: string) => {
    const response = await apiClient.put(`/courses/${courseId}/unretire`);
    return response.data as Course;
  },
  uploadThumbnail: async (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const response = await apiClient.post(`/courses/${courseId}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  uploadAttachment: async (courseId: string, file: File, moduleId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (moduleId) formData.append('moduleId', moduleId);
    const response = await apiClient.post(`/courses/${courseId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data as CourseAttachment;
  },

  deleteAttachment: async (attachmentId: string) => {
    await apiClient.delete(`/courses/attachments/${attachmentId}`);
  },
  verifyAttendance: async (moduleId: string, passcode: string) => {
    const response = await apiClient.post(`/courses/modules/${moduleId}/verify-attendance`, { passcode });
    return response.data;
  }

};




