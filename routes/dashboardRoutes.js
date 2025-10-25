import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDashboardOverview,
  getCRMStats,
  getInventoryStats,
  getEmployeeStats,
  getRevenueStats,
  getRecentActivities,
  getNotificationCounts
} from '../controllers/reminderDashboardController.js';

const router = express.Router();

router.use(protect);

// Dashboard Overview
router.get('/overview', getDashboardOverview);

// CRM Stats
router.get('/crm-stats', getCRMStats);

// Inventory Stats
router.get('/inventory-stats', getInventoryStats);

// Employee Stats
router.get('/employee-stats', getEmployeeStats);

// Revenue Stats
router.get('/revenue-stats', authorize('main_admin', 'sub_admin'), getRevenueStats);

// Recent Activities
router.get('/recent-activities', getRecentActivities);

// Notification Counts
router.get('/notifications', getNotificationCounts);

export default router;
