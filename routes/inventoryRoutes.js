import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  materialInward,
  materialOutward,
  getLowStockMaterials,
  returnMaterial,
  getMaterialHistory,
  autoRestockFromInvoice,
  bulkMaterialOperations,
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  addVendorInvoice,
  getStockSummary
} from '../controllers/inventoryController.js';

const router = express.Router();

router.use(protect);
router.use(moduleAccess('inventory', 'all'));

// Materials
router.get('/materials/low-stock', getLowStockMaterials);
router.get('/materials', getMaterials);
router.post('/materials', checkPermission('canCreate'), createMaterial);
router.get('/materials/:id', getMaterial);
router.get('/materials/:id/history', getMaterialHistory);
router.put('/materials/:id', checkPermission('canEdit'), updateMaterial);
router.delete('/materials/:id', checkPermission('canDelete'), deleteMaterial);
router.post('/materials/:id/inward', checkPermission('canCreate'), materialInward);
router.post('/materials/:id/outward', checkPermission('canCreate'), materialOutward);
router.post('/materials/:id/return', checkPermission('canCreate'), returnMaterial);
router.post('/materials/auto-restock', checkPermission('canCreate'), autoRestockFromInvoice);
router.post('/materials/bulk-operations', checkPermission('canCreate'), bulkMaterialOperations);

// Vendors
router.get('/vendors', getVendors);
router.post('/vendors', checkPermission('canCreate'), createVendor);
router.get('/vendors/:id', getVendor);
router.put('/vendors/:id', checkPermission('canEdit'), updateVendor);
router.delete('/vendors/:id', checkPermission('canDelete'), deleteVendor);
router.post('/vendors/:id/invoice', checkPermission('canCreate'), addVendorInvoice);

// Reports
router.get('/reports/stock-summary', getStockSummary);

export default router;
