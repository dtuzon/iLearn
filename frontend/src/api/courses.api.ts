import apiClient from './client';
import type { QuizQuestion } from './quizzes.api';

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
  versionTag: string | null;
  changeSummary: string | null;
  parentId: string | null;
  isLatest: boolean;
  passingGrade: number;
  targetAudience: string;
  targetDepartments: string[];
  requires180DayEval: boolean;
  hasCertificate: boolean;
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
  type: 'PRE_QUIZ' | 'VIDEO' | 'WORKSHOP' | 'POST_QUIZ' | 'EVALUATION' | 'ONLINE_EVALUATION' | 'INTRODUCTION' | 'CLOSING' | 'LIVE_SESSION' | 'ASSIGNMENT';

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
  quizQuestions?: QuizQuestion[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}


export const coursesApi = {
  getAll: async (tab: string = 'active'): Promise<Course[]> => {
    const response = await apiClient.get(`/courses?tab=${tab}`);
    return response.data;
  },
  getById: async (id: string): Promise<Course> => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },
  getModule: async (moduleId: string): Promise<CourseModule> => {
    const response = await apiClient.get(`/courses/modules/${moduleId}`);
    return response.data;
  },

  create: async (data: { title: string; description?: string; passingGrade: number; targetAudience: string }): Promise<Course> => {
    const response = await apiClient.post('/courses', data);
    return response.data;
  },
  addModule: async (courseId: string, data: { title: string; type: string; sequenceOrder: number; facilitators?: string[] }): Promise<CourseModule> => {
    const response = await apiClient.post(`/courses/${courseId}/modules`, data);
    return response.data;
  },
  updateModule: async (courseId: string, moduleId: string, data: Partial<CourseModule>): Promise<CourseModule> => {
    const response = await apiClient.patch(`/courses/${courseId}/modules/${moduleId}`, data);
    return response.data;
  },
  deleteModule: async (courseId: string, moduleId: string): Promise<void> => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
  },
  updateCertificateTemplate: async (courseId: string, formData: FormData): Promise<any> => {
    const response = await apiClient.put(`/courses/${courseId}/certificate-template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  partialUpdate: async (courseId: string, data: Partial<Course>): Promise<Course> => {
    const response = await apiClient.patch(`/courses/${courseId}`, data);
    return response.data;
  },
  updateStatus: async (courseId: string, status: string, force?: boolean): Promise<Course> => {
    const response = await apiClient.patch(`/courses/${courseId}/status`, { status, force });
    return response.data;
  },
  getActiveLearners: async (courseId: string): Promise<Array<{
    id: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      username: string;
      email: string | null;
      department: { name: string } | null;
    };
  }>> => {
    const response = await apiClient.get(`/courses/${courseId}/active-learners`);
    return response.data;
  },
  createDraftVersion: async (courseId: string): Promise<Course> => {
    const response = await apiClient.post(`/courses/${courseId}/create-draft-version`);
    return response.data;
  },
  getVersions: async (parentId: string): Promise<Course[]> => {
    const response = await apiClient.get(`/courses/${parentId}/versions`);
    return response.data;
  },
  restoreVersion: async (versionId: string): Promise<Course> => {
    const response = await apiClient.post(`/courses/${versionId}/restore-version`);
    return response.data;
  },
  unretire: async (courseId: string): Promise<Course> => {
    const response = await apiClient.put(`/courses/${courseId}/unretire`);
    return response.data;
  },
  uploadThumbnail: async (courseId: string, file: File): Promise<{ thumbnailUrl: string }> => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const response = await apiClient.post(`/courses/${courseId}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  uploadAttachment: async (courseId: string, file: File, moduleId?: string): Promise<CourseAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    if (moduleId) formData.append('moduleId', moduleId);
    const response = await apiClient.post(`/courses/${courseId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await apiClient.delete(`/courses/attachments/${attachmentId}`);
  },
  verifyAttendance: async (moduleId: string, passcode: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/courses/modules/${moduleId}/verify-attendance`, { passcode });
    return response.data;
  },
  discardDraft: async (courseId: string): Promise<void> => {
    await apiClient.delete(`/courses/${courseId}/discard-draft`);
  }

};




