import { Router } from 'express';
import { postContactController } from '../controllers/contact/post.controller';

const router = Router();

router.post('/', postContactController);

export default router;
