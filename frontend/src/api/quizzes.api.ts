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
    const response = await apiClient.post(`/quizzes/${moduleId}/questions`, { questions: [data] });
    return response.data;
  },
  addQuestions: async (moduleId: string, questions: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }[]) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/questions`, { questions });
    return response.data;
  },
  submitQuiz: async (moduleId: string, answers: { questionId: string; optionId: string }[]) => {
    const response = await apiClient.post(`/quizzes/${moduleId}/submit`, { answers });
    return response.data as { score: number; passed: boolean; message: string };
  },
  updateQuestion: async (questionId: string, data: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }) => {
    const response = await apiClient.patch(`/quizzes/questions/${questionId}`, data);
    return response.data;
  },
  deleteQuestion: async (questionId: string) => {
    await apiClient.delete(`/quizzes/questions/${questionId}`);
  },
  clearQuestions: async (moduleId: string) => {
    await apiClient.delete(`/quizzes/${moduleId}/questions`);
  },
  syncQuiz: async (moduleId: string, questions: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }[]) => {
    const response = await apiClient.put(`/quizzes/${moduleId}/sync`, { questions });
    return response.data;
  }
};
