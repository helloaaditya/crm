import express from 'express';
import { protect, checkRole } from '../middleware/auth.js';
import {
  startTracking,
  updateLocation,
  stopTracking,
  getActiveLocations,
  getLocationHistory,
  getMyTrackingStatus,
  getTrackingStats
} from '../controllers/locationTrackingController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes - for tracking their own location
router.post('/start', startTracking);
router.post('/update', updateLocation);
router.post('/stop', stopTracking);
router.get('/my-status', getMyTrackingStatus);

// Admin routes - for viewing employee locations
router.get('/active', checkRole('admin', 'main_admin'), getActiveLocations);
router.get('/history/:employeeId', checkRole('admin', 'main_admin'), getLocationHistory);
router.get('/stats', checkRole('admin', 'main_admin'), getTrackingStats);

export default router;

