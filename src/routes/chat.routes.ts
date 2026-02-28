import { Router } from 'express';
import * as chatController from '../controllers/chat';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/chat - Stream chat response
router.post('/', authMiddleware, chatController.postChat);

export default router;
