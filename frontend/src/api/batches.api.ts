import apiClient from './client';
import type { LearningPathCourse } from './learning-paths.api';

export interface BatchCourseSchedule {
  id: string;
  batchId: string;
  courseId: string;
  startDate: string | null;
  endDate: string | null;
  order: number;
  course: { title: string };
}

export interface BatchActivityChecker {
  id: string;
  batchId: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string;
    role: string;
  };
}

export interface BatchEnrollment {
  id: string;
  batchId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    email: string | null;
    department: { name: string } | null;
  };
}

export interface CreateBatchInput {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  checkerIds: string[];
  learnerIds: string[];
  notifyScheduleChanges: boolean;
  requires180DayEval: boolean;
  courseSchedules: {
    courseId: string;
    startDate: string | null;
    endDate: string | null;
    order: number;
  }[];
  courseId: string | null;
  learningPathId: string | null;
}

export interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  courseId?: string;
  learningPathId?: string;
  course?: { title: string };
  learningPath?: { title: string; pathCourses?: LearningPathCourse[] };
  courseSchedules?: BatchCourseSchedule[];
  activityCheckers?: BatchActivityChecker[];
  enrollments?: BatchEnrollment[];
  learningPathEnrollments?: BatchEnrollment[];
  requires180DayEval?: boolean;
  liveSessions?: {
    id: string;
    courseModuleId: string;
    zoomMeetingId: string;
    zoomPasscode: string;
    joinUrl: string;
    startUrl?: string;
    scheduledAt: string;
    topic: string;
  }[];
  _count?: {
    enrollments: number;
    learningPathEnrollments: number;
  };
}

export const batchesApi = {
  getAll: async () => {
    const response = await apiClient.get('/batches');
    return response.data as Batch[];
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/batches/${id}`);
    return response.data as Batch;
  },

  create: async (data: CreateBatchInput) => {
    const response = await apiClient.post('/batches', data);
    return response.data as Batch;
  },

  update: async (id: string, data: Partial<CreateBatchInput>) => {
    const response = await apiClient.put(`/batches/${id}`, data);
    return response.data as Batch;
  },

  assignLearners: async (id: string, userIds: string[]) => {
    await apiClient.post(`/batches/${id}/assign-learners`, { userIds });
  },

  getAnalytics: async (id: string, filters?: { departmentId?: string; role?: string; status?: string }) => {
    let url = `/batches/${id}/analytics`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    const response = await apiClient.get(url);
    return response.data as {
      name: string;
      startDate: string;
      endDate: string;
      status: string;
      totalLearners: number;
      completionRate: number;
      averageScore: number;
      distribution: { name: string; value: number; fill: string }[];
      topPerformers: { name: string; averageScore: number }[];
      kashMetrics: { domain: string; score: number }[];
      knowledgeDelta: { preQuizAvg: number; postQuizAvg: number; percentageIncrease: number };
      learnerDetails: { 
        id: string; 
        name: string; 
        department: string; 
        role: string; 
        status: string; 
        enrolledAt: string; 
        preQuizAvg: number;
        postQuizAvg: number;
        activityScoreAvg: number;
        averageScore: number;
        courses: { id: string; title: string; preQuizScore: number; postQuizScore: number; activityScore: number; status: string; averageScore: number }[];
      }[];
      courseDetails: { 
        id: string; 
        title: string; 
        startDate: string;
        endDate: string;
        completionRate: number;
        avgQuizScore: number;
        avgActivityScore: number;
        averageScore: number;
        passedCount: number;
        failedCount: number;
        incompleteCount: number;
        enrolledStudents: { id: string; name: string; department: string; status: string; score: number; quizScore: number; activityScore: number; result: string; completedAt: string | null }[];
      }[];
    };
  },

  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.patch(`/batches/${id}/cancel`, { reason });
    return response.data as { message: string; affectedLearners: number };
  },

  delete: async (id: string) => {
    await apiClient.delete(`/batches/${id}`);
  }
};
