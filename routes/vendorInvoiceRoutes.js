import express from 'express';
import {
  createVendorInvoice,
  getVendorInvoices,
  getVendorInvoiceById,
  updateVendorInvoice,
  deleteVendorInvoice,
  linkPaymentToInvoice,
  getOutstandingInvoices
} from '../controllers/vendorInvoiceController.js';
import { protect, moduleAccess } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Module access control - inventory or all modules
router.use(moduleAccess('inventory', 'all'));

router.route('/')
  .get(getVendorInvoices)
  .post(createVendorInvoice);

router.get('/stats/outstanding', getOutstandingInvoices);

router.route('/:id')
  .get(getVendorInvoiceById)
  .put(updateVendorInvoice)
  .delete(deleteVendorInvoice);

router.post('/:id/link-payment', linkPaymentToInvoice);

export default router;

