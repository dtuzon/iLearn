import app from './app';
import { initEvaluationWorker } from './workers/evaluation.worker';
import { initDeadlineWorker } from './workers/deadline.worker';

const PORT = process.env.PORT || 3001;

// Initialize Background Workers
initEvaluationWorker();
initDeadlineWorker();


const server = app.listen(PORT, () => {

  console.log(`🚀 iLearn API running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
