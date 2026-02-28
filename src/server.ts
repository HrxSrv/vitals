import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from '@middlewares/error.middleware';
import authRoutes from '@routes/auth.routes';
import profileRoutes from '@routes/profile.routes';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);

// Additional routes will be added here
// app.use('/api/reports', reportRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/biomarkers', biomarkerRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/settings/notifications', notificationRoutes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

export default app;
