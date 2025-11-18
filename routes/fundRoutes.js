import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import {
  getFunds,
  addFunds,
  deductFundsManually,
  getFundHistory,
  getFundStats,
  getEmployeeFunds,
  addEmployeeFunds,
  getEmployeeFundHistory,
  getAllEmployeesFunds,
  addFundsToEmployee
} from '../controllers/fundController.js';

const router = express.Router();

// Company funds routes
router.get('/', protect, moduleAccess('expense', 'all'), getFunds);
router.post('/add', protect, moduleAccess('expense', 'all'), checkPermission('canHandleAccounts'), addFunds);
router.post('/deduct', protect, moduleAccess('expense', 'all'), checkPermission('canHandleAccounts'), deductFundsManually);
router.get('/history', protect, moduleAccess('expense', 'all'), getFundHistory);
router.get('/stats', protect, moduleAccess('expense', 'all'), getFundStats);

// Employee funds routes
// Get my funds (employee)
router.get('/employee/my', protect, getEmployeeFunds);
router.post('/employee/my/add', protect, addEmployeeFunds);
router.get('/employee/my/history', protect, getEmployeeFundHistory);

// Get all employees' funds (admin)
router.get('/employees/all', protect, moduleAccess('employee_funds', 'expense', 'all'), getAllEmployeesFunds);

// Manage specific employee funds (admin)
router.get('/employee/:employeeId', protect, moduleAccess('employee_funds', 'expense', 'all'), getEmployeeFunds);
router.post('/employee/:employeeId/add', protect, moduleAccess('employee_funds', 'expense', 'all'), checkPermission('canHandleAccounts'), addFundsToEmployee);
router.get('/employee/:employeeId/history', protect, moduleAccess('employee_funds', 'expense', 'all'), getEmployeeFundHistory);

export default router;

