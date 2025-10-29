import express from 'express';
import { protect } from '../middleware/auth.js';
import { proxyS3Media } from '../controllers/mediaController.js';

const router = express.Router();

router.use(protect);

router.get('/proxy', proxyS3Media);

export default router;


