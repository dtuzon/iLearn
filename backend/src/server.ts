import app from './app';

const PORT = process.env.PORT || 3001;

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
