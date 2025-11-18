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
// Allow admin, main_admin, users with 'all' module, or users with live-tracking module access
router.get('/active', (req, res, next) => {
  const userRole = req.user.role;
  const userModule = req.user.module || '';
  
  // Check role
  if (userRole === 'admin' || userRole === 'main_admin') {
    return next();
  }
  
  // Check for 'all' module
  if (userModule === 'all') {
    return next();
  }
  
  // Check for live-tracking module access (supports both 'admin:live-tracking' and 'live-tracking')
  const userModules = userModule.split(',').map(m => m.trim()).filter(m => m);
  const hasLiveTrackingAccess = userModules.some(module => {
    return module === 'all' || 
           module === 'live-tracking' || 
           module === 'admin:live-tracking' ||
           module.startsWith('live-tracking:') ||
           module.startsWith('admin:live-tracking:');
  });
  
  if (hasLiveTrackingAccess) {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'You don\'t have access to this module. Required: admin role, all module, or live-tracking module access' 
  });
}, getActiveLocations);
router.get('/history/:employeeId', authorize('admin', 'main_admin'), getLocationHistory);
router.get('/stats', authorize('admin', 'main_admin'), getTrackingStats);
router.get('/session-analytics/:sessionId', authorize('admin', 'main_admin'), getSessionAnalytics);
router.post('/admin-cleanup', authorize('admin', 'main_admin'), adminCleanupDuplicates);

export default router;

