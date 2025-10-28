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

// Debug endpoint to check database connection
router.get('/debug', checkPermission('canEdit'), async (req, res) => {
  try {
    const Settings = (await import('../models/Settings.js')).default;
    const count = await Settings.countDocuments();
    const allSettings = await Settings.find();
    
    res.json({
      success: true,
      data: {
        count,
        settings: allSettings,
        message: 'Database connection working'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database connection failed'
    });
  }
});

export default router;