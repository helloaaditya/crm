import express from 'express';
import { proxyS3Media } from '../controllers/mediaController.js';

const router = express.Router();

// Media proxy doesn't require authentication since HTML <audio>/<img> tags can't send auth headers
// The S3 URLs themselves are secure (signed/private) and already validated on upload
router.get('/proxy', proxyS3Media);

export default router;


