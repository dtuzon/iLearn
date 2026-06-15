import apiClient from './client';

export const TemplateCategory = {
  COURSE_QUALITY: 'COURSE_QUALITY',
  KASH_EVALUATION: 'KASH_EVALUATION',
  BEHAVIORAL_180_DAY: 'BEHAVIORAL_180_DAY'
} as const;
export type TemplateCategory = typeof TemplateCategory[keyof typeof TemplateCategory];

export const KashDomain = {
  KNOWLEDGE: 'KNOWLEDGE',
  ATTITUDE: 'ATTITUDE',
  SKILLS: 'SKILLS',
  HABITS: 'HABITS'
} as const;
export type KashDomain = typeof KashDomain[keyof typeof KashDomain];

export const EvalQuestionType = {
  RATING_1_TO_5: 'RATING_1_TO_5',
  TEXT_RESPONSE: 'TEXT_RESPONSE',
  YES_NO: 'YES_NO'
} as const;
export type EvalQuestionType = typeof EvalQuestionType[keyof typeof EvalQuestionType];

export interface EvaluationQuestion {
  id?: string;
  text: string;
  type: EvalQuestionType;
  kashDomain?: KashDomain;
  order: number;
}

export interface EvaluationTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  isActive: boolean;
  questions: EvaluationQuestion[];
  createdAt: string;
}

export interface PendingTeamEvaluation {
  id: string;
  employeeId: string;
  employeeName: string;
  courseId: string;
  courseName: string;
  completionDate: string;
}

export const evaluationsApi = {
  // Templates
  createTemplate: async (data: Omit<EvaluationTemplate, 'id' | 'createdAt' | 'isActive'>): Promise<EvaluationTemplate> => {
    const response = await apiClient.post('/evaluations/templates', data);
    return response.data;
  },
  getTemplates: async (category?: TemplateCategory): Promise<EvaluationTemplate[]> => {
    const response = await apiClient.get('/evaluations/templates', { params: { category } });
    return response.data;
  },
  getTemplateById: async (id: string): Promise<EvaluationTemplate> => {
    const response = await apiClient.get(`/evaluations/templates/${id}`);
    return response.data;
  },
  updateTemplate: async (id: string, data: Partial<Omit<EvaluationTemplate, 'id' | 'createdAt'>>): Promise<EvaluationTemplate> => {
    const response = await apiClient.put(`/evaluations/templates/${id}`, data);
    return response.data;
  },

  // Responses
  submitResponse: async (data: {
    courseId: string;
    templateId: string;
    answers: Record<string, string | number>;
    evaluatorId?: string;
  }): Promise<{ id: string }> => {
    const response = await apiClient.post('/evaluations/responses', data);
    return response.data;
  },
  getResponsesByCourse: async (courseId: string): Promise<any[]> => {
    const response = await apiClient.get(`/evaluations/responses/course/${courseId}`);
    return response.data;
  },

  // Legacy/Compatibility methods for Supervisor evaluations (to be migrated later if needed)
  getPendingTeam: async (): Promise<PendingTeamEvaluation[]> => {
    const response = await apiClient.get('/evaluations/pending-team');
    return response.data;
  },
  submitBehavioralEvaluation: async (data: {
    employeeId: string;
    courseId: string;
    moduleRatings: {
      moduleName: string;
      beforeRating: number;
      afterRating: number;
      explanation: string;
    }[];
    overallImpact: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/evaluations/behavioral', data);
    return response.data;
  }
};
