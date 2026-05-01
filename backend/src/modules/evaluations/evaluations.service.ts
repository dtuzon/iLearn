import { prisma } from '../../lib/prisma';
import { TemplateCategory, EvalQuestionType, KashDomain } from '@prisma/client';

export class EvaluationsService {
  // Template Management
  static async createTemplate(data: {
    name: string;
    description?: string;
    category: TemplateCategory;
    questions: { text: string; type: EvalQuestionType; kashDomain?: KashDomain; order: number }[];
  }) {
    return prisma.evaluationTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        questions: {
          create: data.questions.map(q => ({
            text: q.text,
            type: q.type,
            kashDomain: q.kashDomain,
            order: q.order
          }))
        }
      },
      include: { questions: true }
    });
  }

  static async getTemplates(category?: TemplateCategory) {
    return prisma.evaluationTemplate.findMany({
      where: category ? { category } : {},
      include: { questions: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getTemplateById(id: string) {
    return prisma.evaluationTemplate.findUnique({
      where: { id },
      include: { questions: true }
    });
  }

  static async updateTemplate(id: string, data: any) {
    // For simplicity in the builder, we'll delete and recreate questions if they changed
    if (data.questions) {
      await prisma.evaluationQuestion.deleteMany({ where: { templateId: id } });
    }

    return prisma.evaluationTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        isActive: data.isActive,
        questions: data.questions ? {
          create: data.questions.map((q: any) => ({
            text: q.text,
            type: q.type,
            kashDomain: q.kashDomain,
            order: q.order
          }))
        } : undefined
      },
      include: { questions: true }
    });
  }

  // Evaluation Responses
  static async submitResponse(data: {
    courseId: string;
    userId: string;
    templateId: string;
    evaluatorId?: string;
    answers: any;
  }) {
    return prisma.evaluationResponse.create({
      data: {
        courseId: data.courseId,
        userId: data.userId,
        templateId: data.templateId,
        evaluatorId: data.evaluatorId,
        answers: data.answers
      }
    });
  }

  static async getResponsesByCourse(courseId: string) {
    return prisma.evaluationResponse.findMany({
      where: { courseId },
      include: { user: true },
      orderBy: { submittedAt: 'desc' }
    });
  }
}
