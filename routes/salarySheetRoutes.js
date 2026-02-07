import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getSalarySheet,
  updateSalarySheetEntry,
  bulkSaveSalarySheet,
  markSalaryPaid,
  markSalaryUnpaid,
  deleteSalarySheetEntry
} from '../controllers/salarySheetController.js';

const router = express.Router();

router.use(protect);

// Get salary sheet for a month
router.get('/', getSalarySheet);

// Bulk save
router.post('/bulk', bulkSaveSalarySheet);

// Update single employee entry
router.put('/:employeeId', updateSalarySheetEntry);

// Mark as paid/unpaid
router.put('/:employeeId/mark-paid', markSalaryPaid);
router.put('/:employeeId/mark-unpaid', markSalaryUnpaid);

// Delete entry
router.delete('/:employeeId', deleteSalarySheetEntry);

export default router;
