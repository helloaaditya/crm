import express from 'express';
import { protect, moduleAccess, checkPermission } from '../middleware/auth.js';
import { upload, uploadMemory } from '../middleware/upload.js';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addSiteVisit,
  uploadProjectImages,
  addMaterialRequirement,
  addReturnedMaterial,
  generateQuotation,
  generateWarranty,
  assignEmployee,
  addWorkUpdate,
  uploadProjectFiles,
  getProjectHistory,
  deleteProjectMedia,
  addComment,
  updateProjectStatus,
  markProjectComplete,
  removeEmployee
} from '../controllers/projectController.js';

const router = express.Router();

router.use(protect);

// Routes accessible to assigned employees (no module restriction)
router.put('/:id/mark-complete', markProjectComplete); // Employees can mark their assigned projects complete
router.post('/:id/work-update', uploadMemory.array('files', 20), addWorkUpdate); // Employees can add work updates

// Apply module access for admin/management routes
router.use(moduleAccess('crm', 'inventory', 'all'));

router.get('/', getProjects);
router.post('/', checkPermission('canCreate'), createProject);
router.get('/:id', getProject);
router.get('/:id/history', getProjectHistory);
router.delete('/:id/history/media', deleteProjectMedia);
router.put('/:id', checkPermission('canEdit'), updateProject);
router.put('/:id/status', checkPermission('canEdit'), updateProjectStatus);
router.post('/:id/assign-employee', checkPermission('canEdit'), assignEmployee);
router.delete('/:id/remove-employee/:employeeId', checkPermission('canEdit'), removeEmployee);
router.post('/:id/comment', checkPermission('canCreate'), addComment);
router.post('/:id/site-visit', checkPermission('canCreate'), addSiteVisit);
// Use memory storage for S3-only uploads
router.post('/:id/images', uploadMemory.array('projectImages', 10), uploadProjectImages);
router.post('/:id/upload-files', uploadMemory.array('files', 20), uploadProjectFiles);
router.post('/:id/materials', checkPermission('canCreate'), addMaterialRequirement);
router.post('/:id/return-materials', checkPermission('canCreate'), addReturnedMaterial);
router.get('/:id/quotation', generateQuotation);
router.get('/:id/warranty', generateWarranty);
router.delete('/:id', checkPermission('canDelete'), deleteProject);

export default router;