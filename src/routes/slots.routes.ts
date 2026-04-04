import { Router, type Router as RouterType } from 'express';
import { getSlots, setSlots } from '@controllers/slots';
import { authMiddleware } from '@middlewares/auth.middleware';

const router: RouterType = Router();

router.get('/', getSlots);
router.put('/admin', authMiddleware, setSlots);

export default router;
