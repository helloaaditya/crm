import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import { customerBulkSample, customerBulkUpload } from '../controllers/importController.js';
import { uploadMemory } from '../middleware/upload.js';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
} from '../controllers/customerController.js';

const router = express.Router();

router.use(protect);
router.use(moduleAccess('crm', 'inventory', 'all'));

// Bulk Import must be before any '/:id' routes
router.get('/bulk/sample', checkPermission('canCreate'), customerBulkSample);
router.post('/bulk/upload', checkPermission('canCreate'), uploadMemory.single('file'), customerBulkUpload);
router.get('/stats', getCustomerStats);
router.get('/', getCustomers);
router.post('/', checkPermission('canCreate'), createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', checkPermission('canEdit'), updateCustomer);
router.delete('/:id', checkPermission('canDelete'), deleteCustomer);

export default router;
