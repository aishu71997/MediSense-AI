import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import routes from './src/server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Set up standard middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Print request logs safely without exposing sensitive client tokens
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // 1. Mount API Router FIRST
  app.use('/api', routes);

  // Health endpoint
  app.get('/api-health', (req, res) => {
    res.json({ status: 'ok', service: 'MediSense AI Backend' });
  });

  // 2. Vite middleware setup based on NODE_ENV environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting Express server in DEVELOPMENT mode with Vite dev middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Mounting Express server in PRODUCTION mode with compiled assets...');
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static frontend files
    app.use(express.static(distPath));
    // Serve index.html as fallback for SPA client-side routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediSense AI Express process online at http://0.0.0.0:${PORT}`);
  });
}

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

startServer();
