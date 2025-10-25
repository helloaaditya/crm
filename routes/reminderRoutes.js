import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import {
  getReminders,
  getUpcomingReminders,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder
} from '../controllers/reminderDashboardController.js';

const router = express.Router();

router.use(protect);

router.get('/upcoming', getUpcomingReminders);
router.get('/', getReminders);
router.post('/', checkPermission('canCreate'), createReminder);
router.put('/:id', checkPermission('canEdit'), updateReminder);
router.put('/:id/complete', completeReminder);
router.delete('/:id', checkPermission('canDelete'), deleteReminder);

export default router;