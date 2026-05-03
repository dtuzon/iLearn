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

  static async getPendingTeam(supervisorId: string) {
    // 1. Get all subordinates
    const subordinates = await prisma.user.findMany({
      where: { immediateSuperiorId: supervisorId },
      select: { id: true, firstName: true, lastName: true }
    });

    const subordinateIds = subordinates.map(s => s.id);

    // 2. Find completed enrollments for subordinates where course requires 180-day eval
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: { in: subordinateIds },
        status: 'COMPLETED',
        course: { requires180DayEval: true }
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, title: true } }
      }
    });

    // 3. Filter out those that already have a behavioral evaluation
    const existingEvaluations = await prisma.behavioralEvaluation.findMany({
      where: {
        employeeId: { in: subordinateIds },
        evaluatorId: supervisorId
      },
      select: { employeeId: true, courseId: true }
    });

    const pending = completedEnrollments.filter(enrollment => {
      return !existingEvaluations.some(ev => 
        ev.employeeId === enrollment.userId && ev.courseId === enrollment.courseId
      );
    });

    // 4. Map to the format expected by the frontend
    return pending.map(p => ({
      id: `${p.userId}-${p.courseId}`, // Synthetic ID
      employeeId: p.userId,
      employeeName: `${p.user.firstName} ${p.user.lastName}`,
      courseId: p.courseId,
      courseName: p.course.title,
      completionDate: p.completedAt
    }));
  }

  static async submitBehavioralEvaluation(data: {
    evaluatorId: string;
    employeeId: string;
    courseId: string;
    moduleRatings: any;
    overallImpact: string;
  }) {
    return prisma.behavioralEvaluation.create({
      data: {
        evaluatorId: data.evaluatorId,
        employeeId: data.employeeId,
        courseId: data.courseId,
        moduleRatings: data.moduleRatings,
        overallImpact: data.overallImpact
      }
    });
  }
}

