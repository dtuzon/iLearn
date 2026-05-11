import apiClient from './client';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ENUMERATION' | 'ESSAY';

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect?: boolean; // present for creator view, hidden in learner view
  questionId: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  sequenceOrder: number;
  type: QuestionType;
  essayPrompt?: string | null;
  maxScore?: number | null;        // Essay only — checker grades up to this value
  enumCaseSensitive?: boolean;     // Enumeration only
  enumOrderMatters?: boolean;      // Enumeration only
  enumStrictPunctuation?: boolean; // Enumeration only
  moduleId: string;
  options: QuizOption[];
}

export interface EssaySubmission {
  id: string;
  questionId: string;
  userId: string;
  moduleId: string;
  response: string;
  score: number | null;
  feedback: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  gradedById: string | null;
  submittedAt: string;
  gradedAt: string | null;
  question: { questionText: string; essayPrompt: string | null; maxScore: number | null };
  user: { id: string; firstName: string; lastName: string; email: string };
}

export type QuizAnswer =
  | { questionId: string; optionId: string }          // MULTIPLE_CHOICE / TRUE_FALSE
  | { questionId: string; enumerationText: string }   // ENUMERATION
  | { questionId: string; essayText: string };        // ESSAY

export interface QuizResult {
  score: number;
  passed: boolean;
  message: string;
  hasEssay: boolean;
}

export const quizzesApi = {
  getModuleQuestions: async (moduleId: string) => {
    const response = await apiClient.get(`/quizzes/${moduleId}`);
    return response.data as QuizQuestion[];
  },

  syncQuiz: async (moduleId: string, questions: Partial<QuizQuestion>[]) => {
    const response = await apiClient.put(`/quizzes/${moduleId}/sync`, { questions });
    return response.data;
  },

  submitQuiz: async (moduleId: string, answers: QuizAnswer[]) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/submit`, { answers });
    return response.data as QuizResult;
  },

  updateQuestion: async (questionId: string, data: Partial<QuizQuestion>) => {
    const response = await apiClient.patch(`/quizzes/questions/${questionId}`, data);
    return response.data;
  },

  deleteQuestion: async (questionId: string) => {
    await apiClient.delete(`/quizzes/questions/${questionId}`);
  },

  clearQuestions: async (moduleId: string) => {
    await apiClient.delete(`/quizzes/${moduleId}/questions`);
  },

  // Essay grading
  getEssaySubmissions: async (moduleId: string) => {
    const response = await apiClient.get(`/quizzes/${moduleId}/essays`);
    return response.data as EssaySubmission[];
  },

  gradeEssay: async (submissionId: string, score: number, feedback: string) => {
    const response = await apiClient.patch(`/quizzes/essays/${submissionId}/grade`, { score, feedback });
    return response.data as EssaySubmission;
  },

  // Legacy helpers kept for compatibility
  addQuestion: async (moduleId: string, data: Partial<QuizQuestion>) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/questions`, { questions: [data] });
    return response.data;
  },
  addQuestions: async (moduleId: string, questions: Partial<QuizQuestion>[]) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/questions`, { questions });
    return response.data;
  },
};
