import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import { apkUpload } from '../middleware/upload.js';
import {
  getApkInfo,
  downloadApk,
  uploadApk
} from '../controllers/apkController.js';

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large! Maximum size is 150MB. Please use a smaller APK file.'
      });
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

// Public routes (for download)
router.get('/', getApkInfo);
router.get('/download', downloadApk);

// Admin routes (for upload)
router.post('/upload', protect, checkPermission('canEdit'), apkUpload.single('apk'), handleMulterError, uploadApk);

export default router;

