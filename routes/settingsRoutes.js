import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import {
  getSettings,
  updateSettings,
  getMySettings,
  updateMySettings
} from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect);

// User-specific settings (accessible to all users)
router.get('/my-settings', getMySettings);
router.put('/my-settings', updateMySettings);

// Admin settings (admin only)
router.get('/', checkPermission('canEdit'), getSettings);
router.put('/', checkPermission('canEdit'), updateSettings);

export default router;