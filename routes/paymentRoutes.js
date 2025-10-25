import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import {
  getPayments,
  getPayment,
  createPaymentOrder,
  verifyPayment,
  recordManualPayment
} from '../controllers/invoicePaymentController.js';

const router = express.Router();

router.use(protect);

// Create Razorpay order
router.post('/create-order', createPaymentOrder);

// Verify payment
router.post('/verify', verifyPayment);

// Record manual payment
router.post('/manual', checkPermission('canHandleAccounts'), recordManualPayment);

// Get all payments
router.get('/', getPayments);

// Get payment by ID
router.get('/:id', getPayment);

export default router;