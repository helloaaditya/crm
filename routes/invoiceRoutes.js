import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoicePDFFile,
  sendInvoiceViaEmail,
  convertQuotationToInvoice
} from '../controllers/invoicePaymentController.js';
import { invoiceBulkSample, invoiceBulkUpload } from '../controllers/importController.js';
import { uploadMemory } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.post('/', checkPermission('canCreate'), createInvoice);

// Bulk import routes (must be before /:id routes)
router.get('/bulk/sample', checkPermission('canCreate'), invoiceBulkSample);
router.post('/bulk/upload', checkPermission('canCreate'), uploadMemory.single('file'), invoiceBulkUpload);

router.get('/:id', getInvoice);
router.get('/:id/pdf', generateInvoicePDFFile);
router.get('/:id/download', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ message: 'Filename required' });
  }
  const filePath = path.join(__dirname, '../uploads/invoices', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  res.download(filePath);
});
router.put('/:id', checkPermission('canEdit'), updateInvoice);
router.delete('/:id', checkPermission('canDelete'), deleteInvoice);
router.post('/:id/send-email', sendInvoiceViaEmail);
router.post('/:id/convert-to-invoice', checkPermission('canCreate'), convertQuotationToInvoice);

export default router;
