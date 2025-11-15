import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import {
  getFunds,
  addFunds,
  getFundHistory,
  getFundStats
} from '../controllers/fundController.js';

const router = express.Router();

// All routes require authentication and expense module access
router.use(protect);
router.use(moduleAccess('expense', 'all'));

// Get current funds
router.get('/', getFunds);

// Get fund statistics
router.get('/stats', getFundStats);

// Get fund history
router.get('/history', getFundHistory);

// Add funds (requires canHandleAccounts permission)
router.post('/add', checkPermission('canHandleAccounts'), addFunds);

export default router;

