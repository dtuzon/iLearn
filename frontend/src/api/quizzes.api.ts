import apiClient from './client';

export interface QuizQuestion {
  id: string;
  questionText: string;
  sequenceOrder: number;
  moduleId: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  questionId: string;
}

export const quizzesApi = {
  getModuleQuestions: async (moduleId: string) => {
    const response = await apiClient.get(`/quizzes/${moduleId}`);
    return response.data as QuizQuestion[];
  },
  addQuestion: async (moduleId: string, data: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/questions`, data);
    return response.data;
  },
  submitQuiz: async (moduleId: string, answers: { questionId: string; optionId: string }[]) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/submit`, { answers });
    return response.data as { score: number; passed: boolean; message: string };
  }
};
