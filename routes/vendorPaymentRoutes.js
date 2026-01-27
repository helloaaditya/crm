import express from 'express';
import {
  createVendorPayment,
  getVendorPayments,
  getVendorPaymentById,
  updateVendorPayment,
  deleteVendorPayment,
  cancelVendorPayment,
  getPaymentStats,
  getVendorWisePayments,
  addPartialPayment
} from '../controllers/vendorPaymentController.js';
import { protect, moduleAccess } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Module access control - inventory or all modules
router.use(moduleAccess('inventory', 'all'));

router.route('/')
  .get(getVendorPayments)
  .post(createVendorPayment);

router.get('/stats/summary', getPaymentStats);
router.get('/stats/by-vendor', getVendorWisePayments);

router.route('/:id')
  .get(getVendorPaymentById)
  .put(updateVendorPayment)
  .delete(deleteVendorPayment);

router.put('/:id/cancel', cancelVendorPayment);
router.post('/:id/pay-due', addPartialPayment);

export default router;

