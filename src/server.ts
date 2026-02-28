import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from '@middlewares/error.middleware';
import { requestLoggerMiddleware } from '@middlewares/request-logger.middleware';
import authRoutes from '@routes/auth.routes';
import profileRoutes from '@routes/profile.routes';
import reportRoutes from '@routes/report.routes';
import dashboardRoutes from '@routes/dashboard.routes';
import biomarkerRoutes from '@routes/biomarker.routes';
import chatRoutes from '@routes/chat.routes';
import notificationRoutes from '@routes/notification.routes';
import { cronManager } from './lib/cron';
import { logger } from './utils/logger';

// Initialize background workers
import './workers';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use(requestLoggerMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database connectivity
    const { supabaseAdmin } = await import('./services/supabase.service');
    const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    health.services.database = error ? 'error' : 'ok';
  } catch (error) {
    health.services.database = 'error';
  }

  try {
    // Check Redis connectivity
    const { getRedisClient } = await import('./lib/redis');
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = 'ok';
  } catch (error) {
    health.services.redis = 'error';
  }

  // Set status based on service health
  const allServicesOk = Object.values(health.services).every((s) => s === 'ok');
  health.status = allServicesOk ? 'ok' : 'degraded';

  const statusCode = allServicesOk ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/biomarkers', biomarkerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings/notifications', notificationRoutes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log(`✅ Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  
  // Start cron jobs
  cronManager.start();
  logger.info('Cron jobs started');
});

export default app;
