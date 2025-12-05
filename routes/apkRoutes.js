import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import { apkUpload } from '../middleware/upload.js';
import {
  getApkInfo,
  downloadApk,
  uploadApk
} from '../controllers/apkController.js';

const router = express.Router();

// Public routes (for download)
router.get('/', getApkInfo);
router.get('/download', downloadApk);

// Admin routes (for upload)
router.post('/upload', protect, checkPermission('canEdit'), apkUpload.single('apk'), uploadApk);

export default router;

