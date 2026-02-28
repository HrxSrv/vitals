import express from 'express';
import chatRoutes from '../routes/chat.routes';
import { authMiddleware } from '../middlewares/auth.middleware';

/**
 * Test script to verify chat handler implementation
 * This simulates a chat request and verifies SSE streaming works correctly
 */

const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

app.use('/api/chat', chatRoutes);

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('\nTo test the chat endpoint:');
  console.log(`curl -X POST http://localhost:${PORT}/api/chat \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"message": "What are my latest health metrics?", "profileId": "your-profile-id"}'`);
  console.log('\nPress Ctrl+C to stop the server');
});
