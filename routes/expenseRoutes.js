import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  processExpensePayment,
  payExpenseFromOwnFunds,
  createAndPayExpenseDirect,
  getMyExpenses,
  getExpenseStats,
  uploadExpenseDocuments
} from '../controllers/expenseController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============= EMPLOYEE SELF-SERVICE ROUTES =============
// These routes are accessible to ALL authenticated users

// My Expenses (Employee Self-Service)
router.get('/my-expenses', getMyExpenses);
router.post('/my-expense', createExpense);
router.post('/my-expense/pay-direct', createAndPayExpenseDirect); // Create and pay expense directly from own funds
router.put('/my-expense/:id', updateExpense);
router.delete('/my-expense/:id', deleteExpense);
router.put('/my-expense/:id/pay', payExpenseFromOwnFunds); // Employee pays from own funds

// Upload expense documents (Employee Self-Service)
router.post('/upload', uploadMemory.array('files', 5), uploadExpenseDocuments);

// ============= EXPENSE MODULE ACCESS ROUTES =============
// These routes require 'expense' or 'all' module access
router.use(moduleAccess('expense', 'all'));

// Expense management (requires expense module)
router.get('/stats', getExpenseStats);
router.get('/', getExpenses);
router.get('/:id', getExpense);

// Approval actions (requires expense module)
router.put('/:id/approve', checkPermission('canEdit'), approveExpense);
router.put('/:id/reject', checkPermission('canEdit'), rejectExpense);

// Payment processing (requires expense module + canHandleAccounts)
router.put('/:id/pay', checkPermission('canHandleAccounts'), processExpensePayment);

export default router;

