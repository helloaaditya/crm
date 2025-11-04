import express from 'express';
import {
  createCompanyDocument,
  getCompanyDocuments,
  getCompanyDocumentById,
  updateCompanyDocument,
  deleteCompanyDocument,
  verifyDocument,
  addDocumentComment,
  getDocumentsByCategory,
  getDocumentStats,
  searchDocuments
} from '../controllers/companyDocumentController.js';
import { protect, moduleAccess } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Module access control - all modules can access company documents
router.use(moduleAccess('crm', 'inventory', 'employee', 'expense', 'all'));

router.get('/search', searchDocuments);
router.get('/stats/summary', getDocumentStats);
router.get('/category/:category', getDocumentsByCategory);

router.route('/')
  .get(getCompanyDocuments)
  .post(createCompanyDocument);

router.route('/:id')
  .get(getCompanyDocumentById)
  .put(updateCompanyDocument)
  .delete(deleteCompanyDocument);

router.put('/:id/verify', verifyDocument);
router.post('/:id/comments', addDocumentComment);

export default router;

