import { Router, type Router as RouterType } from 'express';
import { postContactController } from '../controllers/contact/post.controller';

const router: RouterType = Router();

router.post('/', postContactController);

export default router;
