import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get notifications
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);

// Mark as read
router.put('/read-all', markAllAsRead);
router.put('/read-multiple', markMultipleAsRead);
router.put('/:id/read', markAsRead);

// Delete notifications
router.delete('/read', deleteAllRead);
router.delete('/:id', deleteNotification);

export default router;

