import express from 'express';
import {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  updateWorkOrder,
  addWorkOrderDocument,
  deleteWorkOrder,
  updateWorkOrderStatus,
  assignEmployeeToWorkOrder
} from '../controllers/workOrderController.js';
import { protect, moduleAccess } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Module access control - CRM or all modules
router.use(moduleAccess('crm', 'all'));

router.route('/')
  .get(getWorkOrders)
  .post(createWorkOrder);

router.route('/:id')
  .get(getWorkOrderById)
  .put(updateWorkOrder)
  .delete(deleteWorkOrder);

router.post('/:id/documents', addWorkOrderDocument);
router.put('/:id/status', updateWorkOrderStatus);
router.post('/:id/assign', assignEmployeeToWorkOrder);

export default router;

