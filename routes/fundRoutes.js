import express from 'express';
import { protect, checkModuleAccess } from '../middleware/authMiddleware.js';
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
router.get('/', protect, checkModuleAccess('expense'), getFunds);
router.post('/add', protect, checkModuleAccess('expense'), addFunds);
router.post('/deduct', protect, checkModuleAccess('expense'), deductFundsManually);
router.get('/history', protect, checkModuleAccess('expense'), getFundHistory);
router.get('/stats', protect, checkModuleAccess('expense'), getFundStats);

// Employee funds routes
// Get my funds (employee)
router.get('/employee/my', protect, getEmployeeFunds);
router.post('/employee/my/add', protect, addEmployeeFunds);
router.get('/employee/my/history', protect, getEmployeeFundHistory);

// Get all employees' funds (admin)
router.get('/employees/all', protect, checkModuleAccess('expense'), getAllEmployeesFunds);

// Manage specific employee funds (admin)
router.get('/employee/:employeeId', protect, checkModuleAccess('expense'), getEmployeeFunds);
router.post('/employee/:employeeId/add', protect, checkModuleAccess('expense'), addFundsToEmployee);
router.get('/employee/:employeeId/history', protect, checkModuleAccess('expense'), getEmployeeFundHistory);

export default router;

