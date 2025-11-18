import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  startTracking,
  updateLocation,
  stopTracking,
  getActiveLocations,
  getLocationHistory,
  getMyTrackingStatus,
  getTrackingStats,
  getSessionAnalytics,
  cleanupDuplicateSessions,
  adminCleanupDuplicates
} from '../controllers/locationTrackingController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes - for tracking their own location
router.post('/start', startTracking);
router.post('/update', updateLocation);
router.post('/stop', stopTracking);
router.get('/my-status', getMyTrackingStatus);
router.post('/cleanup', cleanupDuplicateSessions);

// Admin routes - for viewing employee locations
// Allow admin, main_admin, and users with 'all' module access
router.get('/active', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'main_admin' || req.user.module === 'all') {
    return next();
  }
  return res.status(403).json({ message: 'You don\'t have access to this module. Required: admin role or all module access' });
}, getActiveLocations);
router.get('/history/:employeeId', authorize('admin', 'main_admin'), getLocationHistory);
router.get('/stats', authorize('admin', 'main_admin'), getTrackingStats);
router.get('/session-analytics/:sessionId', authorize('admin', 'main_admin'), getSessionAnalytics);
router.post('/admin-cleanup', authorize('admin', 'main_admin'), adminCleanupDuplicates);

export default router;

