import { Router } from 'express';
import { QuizzesController } from './quizzes.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/:moduleId', authenticate, QuizzesController.getQuiz);

router.post(
  '/:moduleId/questions',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  auditLog('ADD_QUIZ_QUESTIONS'),
  QuizzesController.addQuestions
);

router.post(
  '/:moduleId/submit',
  authenticate,
  auditLog('SUBMIT_QUIZ'),
  QuizzesController.submitQuiz
);

router.patch(
  '/questions/:questionId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  QuizzesController.updateQuestion
);

router.delete(
  '/questions/:questionId',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  QuizzesController.deleteQuestion
);

router.delete(
  '/:moduleId/questions',
  authenticate,
  authorize([Role.COURSE_CREATOR, Role.ADMINISTRATOR]),
  QuizzesController.clearQuestions
);

export default router;
