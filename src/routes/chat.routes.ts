import { Router, type Router as RouterType } from 'express';
import * as chatController from '../controllers/chat';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import {
  createSessionSchema,
  listSessionsQuerySchema,
  postChatSchema,
  renameSessionSchema,
} from '../validations/chat.validations';

const router: RouterType = Router();

router.use(authMiddleware);

// Session CRUD
router.get(
  '/sessions',
  validateRequest(listSessionsQuerySchema, 'query'),
  chatController.listSessions
);
router.post(
  '/sessions',
  validateRequest(createSessionSchema),
  chatController.createSession
);
router.get('/sessions/:id', chatController.getSession);
router.patch(
  '/sessions/:id',
  validateRequest(renameSessionSchema),
  chatController.renameSession
);
router.delete('/sessions/:id', chatController.deleteSession);

// POST /api/chat - Stream chat response
router.post('/', validateRequest(postChatSchema), chatController.postChat);

export default router;
