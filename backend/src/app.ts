import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import path from 'path';

// Route Imports
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import departmentsRouter from './modules/departments/departments.router';
import settingsRouter from './modules/settings/settings.router';
import coursesRouter from './modules/courses/courses.router';
import quizzesRouter from './modules/quizzes/quizzes.router';
import workshopsRouter from './modules/modules/workshops.router';
import certificatesRouter from './modules/certificates/certificates.router';
import enrollmentsRouter from './modules/enrollments/enrollments.router';
import evaluationsRouter from './modules/evaluations/evaluations.router';
import learningPathsRouter from './modules/learning-paths/learning-paths.router';
import notificationsRouter from './modules/notifications/notifications.router';
import announcementsRouter from './modules/announcements/announcements.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import catalogRouter from './modules/catalog/catalog.router';






const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/learning-paths', learningPathsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/catalog', catalogRouter);





// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SERVER_ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

export default app;
